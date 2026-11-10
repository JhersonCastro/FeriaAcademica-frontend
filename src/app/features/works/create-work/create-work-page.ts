import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api-error';
import { ActiveEventStore } from '../../../core/events/active-event.store';
import {
  EventSummary,
  EventsService,
  ParticipationDto,
  ProfessorDto,
} from '../../../core/events/events.service';
import { isDeadlinePassed } from '../../../core/works/work-rules';
import { WorksService } from '../../../core/works/works.service';

/**
 * HU-010: the participant creates a work (a draft) in one of their fairs. The reviewer is not
 * chosen: it is the professor who invited the participant to that fair (acta 08, T-12). Files and
 * links are added afterwards, in the work itself.
 */
@Component({
  selector: 'app-create-work-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './create-work-page.html',
  host: { class: 'page-content' },
})
export class CreateWorkPage {
  private readonly works = inject(WorksService);
  private readonly eventsApi = inject(EventsService);
  private readonly router = inject(Router);
  private readonly activeEvents = inject(ActiveEventStore);

  /** Fairs where the signed-in user is a participant: the only ones that can have works. */
  protected readonly participantEvents = computed(() =>
    this.activeEvents.events().filter((event) => event.roles.includes('Participant')),
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    eventId: ['', Validators.required],
    title: ['', [Validators.required, Validators.maxLength(300)]],
    summary: ['', Validators.maxLength(2000)],
  });

  protected readonly loadingEvent = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly participation = signal<ParticipationDto | null>(null);
  protected readonly professors = signal<ProfessorDto[]>([]);
  private readonly eventDetails = signal<EventSummary[] | null>(null);

  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** The select's value as a signal, so the deadline follows the chosen fair. */
  private readonly selectedEventId = signal('');
  protected readonly deadline = computed(
    () =>
      this.eventDetails()?.find((event) => event.id === this.selectedEventId())
        ?.submissionDeadline ?? null,
  );
  protected readonly deadlinePassed = computed(() => isDeadlinePassed(this.deadline()));
  /** The professor who invited the participant: the work's reviewer. */
  protected readonly reviewer = computed(() => {
    const invitedBy = this.participation()?.invitedBy;
    return invitedBy ? (this.professors().find((p) => p.id === invitedBy) ?? null) : null;
  });
  /** Participating without an invitation from a professor of the fair: nobody can review it. */
  protected readonly noReviewer = computed(
    () => this.participation() !== null && !this.loadingEvent() && this.reviewer() === null,
  );
  protected readonly canCreate = computed(
    () =>
      this.participation() !== null &&
      this.reviewer() !== null &&
      !this.deadlinePassed() &&
      !this.loadingEvent(),
  );

  constructor() {
    this.eventsApi.list().subscribe({
      next: (events) => this.eventDetails.set(events),
      error: () => this.eventDetails.set([]),
    });

    const preferred =
      this.participantEvents().find(
        (event) => event.eventId === this.activeEvents.activeEvent()?.eventId,
      ) ?? this.participantEvents()[0];
    if (preferred) {
      this.form.controls.eventId.setValue(preferred.eventId);
      this.loadEvent(preferred.eventId);
    }
  }

  protected onEventChange(): void {
    this.loadEvent(this.form.controls.eventId.value);
  }

  protected showError(control: 'title'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || this.submitted());
  }

  protected create(): void {
    this.submitted.set(true);
    const participation = this.participation();
    const reviewer = this.reviewer();
    if (this.form.invalid || !participation || !reviewer || this.deadlinePassed()) {
      this.form.markAllAsTouched();
      return;
    }
    const { title, summary } = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);
    this.works
      .create({
        participationId: participation.id,
        professorId: reviewer.id,
        title: title.trim(),
        summary: summary.trim() || null,
      })
      .subscribe({
        next: ({ id }) => void this.router.navigate(['/works', id]),
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error));
        },
      });
  }

  /** Loads what the chosen fair needs: the participation to create under and who reviews it. */
  private loadEvent(eventId: string): void {
    this.selectedEventId.set(eventId);
    this.participation.set(null);
    this.professors.set([]);
    this.loadError.set(null);
    if (!eventId) {
      return;
    }
    this.loadingEvent.set(true);
    forkJoin({
      participation: this.eventsApi.myParticipation(eventId),
      professors: this.eventsApi.professors(eventId),
    }).subscribe({
      next: ({ participation, professors }) => {
        this.participation.set(participation);
        this.professors.set(professors);
        this.loadingEvent.set(false);
      },
      error: (error: unknown) => {
        this.loadingEvent.set(false);
        this.loadError.set(
          error instanceof HttpErrorResponse && error.status === 404
            ? 'Todavía no participas en esta feria: acepta primero la invitación de un profesor.'
            : apiErrorMessage(error),
        );
      },
    });
  }
}
