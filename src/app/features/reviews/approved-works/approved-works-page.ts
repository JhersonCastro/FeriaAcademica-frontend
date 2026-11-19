import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { AssignedWorkDto } from '../../../core/models/work';
import { WORK_STATUS_CHIPS, WORK_STATUS_LABELS } from '../../../core/works/work-rules';
import { ReviewsService } from '../../../core/works/works.service';
import { ReviewTabs } from '../review-tabs/review-tabs';

/** The works of the signed-in reviewer that are already approved, and whether their final version arrived. */
@Component({
  selector: 'app-approved-works-page',
  imports: [DatePipe, RouterLink, ReviewTabs],
  templateUrl: './approved-works-page.html',
  host: { class: 'page-content' },
})
export class ApprovedWorksPage {
  protected readonly user = inject(AuthService).user;
  protected readonly today = new Date();
  protected readonly statusLabels = WORK_STATUS_LABELS;
  protected readonly statusChips = WORK_STATUS_CHIPS;

  protected readonly works = signal<AssignedWorkDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    inject(ReviewsService)
      .approved()
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

  protected hasFinalVersion(work: AssignedWorkDto): boolean {
    return work.artifacts.some((artifact) => artifact.isFinal);
  }
}
