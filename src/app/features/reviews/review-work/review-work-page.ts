import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { AssignedWorkDto, ReviewDecision } from '../../../core/models/work';
import {
  ARTIFACT_TYPE_LABELS,
  REVIEW_DECISIONS,
  REVIEW_DECISION_HINTS,
  REVIEW_DECISION_LABELS,
  WORK_STATUS_CHIPS,
  WORK_STATUS_LABELS,
  artifactHref,
  artifactRows,
  decisionError,
} from '../../../core/works/work-rules';
import { ReviewsService } from '../../../core/works/works.service';

type ViewState = 'loading' | 'ready' | 'not-found' | 'decided' | 'error';

/**
 * HU-021: the reviewer opens an assigned work and records the decision (approved, approved with
 * changes or rejected) with feedback for the participant.
 */
@Component({
  selector: 'app-review-work-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './review-work-page.html',
  host: { class: 'page-content' },
})
export class ReviewWorkPage {
  private readonly reviews = inject(ReviewsService);
  private readonly workId = inject(ActivatedRoute).snapshot.paramMap.get('workId') ?? '';

  protected readonly user = inject(AuthService).user;
  protected readonly today = new Date();
  protected readonly statusLabels = WORK_STATUS_LABELS;
  protected readonly artifactHref = artifactHref;
  protected readonly statusChips = WORK_STATUS_CHIPS;
  protected readonly artifactLabels = ARTIFACT_TYPE_LABELS;
  protected readonly decisions = REVIEW_DECISIONS;
  protected readonly decisionLabels = REVIEW_DECISION_LABELS;
  protected readonly decisionHints = REVIEW_DECISION_HINTS;

  protected readonly state = signal<ViewState>('loading');
  protected readonly work = signal<AssignedWorkDto | null>(null);
  protected readonly artifacts = computed(() => artifactRows(this.work()?.artifacts ?? []));
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly decision = signal<ReviewDecision | null>(null);
  protected readonly feedback = signal('');
  protected readonly attempted = signal(false);
  protected readonly busy = signal(false);
  protected readonly lastDecision = signal<ReviewDecision | null>(null);

  protected readonly feedbackRequired = computed(() => {
    const decision = this.decision();
    return decision !== null && decision !== 'Approved';
  });
  protected readonly validationError = computed(() =>
    decisionError(this.decision(), this.feedback()),
  );

  constructor() {
    this.load();
  }

  protected onDecision(event: Event): void {
    this.decision.set((event.target as HTMLInputElement).value as ReviewDecision);
  }

  protected onFeedback(event: Event): void {
    this.feedback.set((event.target as HTMLTextAreaElement).value);
  }

  /** Submitted -> InReview; from here on the author can no longer withdraw the work. */
  protected startReview(): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.reviews.start(this.workId).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }

  protected save(): void {
    this.attempted.set(true);
    const decision = this.decision();
    if (this.validationError() || !decision) {
      return;
    }
    this.busy.set(true);
    this.errorMessage.set(null);
    const feedback = this.feedback().trim() || null;
    this.reviews.decide(this.workId, decision, feedback).subscribe({
      next: () => {
        this.busy.set(false);
        this.lastDecision.set(decision);
        this.state.set('decided');
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }

  /** There is no single-work endpoint for reviewers: the work is taken from the assigned list. */
  private load(): void {
    this.reviews.assigned().subscribe({
      next: (works) => {
        const work = works.find((item) => item.id === this.workId) ?? null;
        this.work.set(work);
        this.state.set(work ? 'ready' : 'not-found');
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.state.set('error');
      },
    });
  }
}
