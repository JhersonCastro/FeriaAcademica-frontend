import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { AssignedWorkDto } from '../../../core/models/work';
import { WORK_STATUS_CHIPS, WORK_STATUS_LABELS } from '../../../core/works/work-rules';
import { ReviewsService } from '../../../core/works/works.service';

/** HU-020: only the works assigned to the signed-in reviewer, oldest in the queue first. */
@Component({
  selector: 'app-review-queue-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './review-queue-page.html',
  host: { class: 'page-content' },
})
export class ReviewQueuePage {
  protected readonly user = inject(AuthService).user;
  protected readonly today = new Date();
  protected readonly statusLabels = WORK_STATUS_LABELS;
  protected readonly statusChips = WORK_STATUS_CHIPS;

  protected readonly works = signal<AssignedWorkDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    inject(ReviewsService)
      .assigned()
      .subscribe({
        next: (works) => {
          this.works.set(works);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(apiErrorMessage(error));
          this.loading.set(false);
        },
      });
  }
}
