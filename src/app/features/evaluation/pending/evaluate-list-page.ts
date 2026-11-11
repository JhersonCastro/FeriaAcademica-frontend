import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/api/api-error';
import { evaluatedCount } from '../../../core/evaluation/evaluation-rules';
import { EvaluationService } from '../../../core/evaluation/evaluation.service';
import { PendingEvaluationDto } from '../../../core/models/evaluation';

/**
 * HU-023: the works the signed-in person can evaluate, grouped by fair. Only closed fairs they
 * attended and that have questions; answering is voluntary.
 */
@Component({
  selector: 'app-evaluate-list-page',
  imports: [RouterLink],
  templateUrl: './evaluate-list-page.html',
  styleUrl: './evaluate-list-page.css',
  host: { class: 'page-content' },
})
export class EvaluateListPage {
  protected readonly evaluatedCount = evaluatedCount;

  protected readonly events = signal<PendingEvaluationDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    inject(EvaluationService)
      .pending()
      .subscribe({
        next: (events) => {
          this.events.set(events.filter((event) => event.works.length));
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(apiErrorMessage(error));
          this.loading.set(false);
        },
      });
  }

  protected percent(event: PendingEvaluationDto): number {
    return event.works.length
      ? Math.round((evaluatedCount(event.works) / event.works.length) * 100)
      : 0;
  }
}
