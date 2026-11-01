import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { MyWorkDto } from '../../../core/models/work';
import {
  REVIEW_RESULT_CHIPS,
  REVIEW_RESULT_LABELS,
  WORK_STATUS_CHIPS,
  WORK_STATUS_LABELS,
} from '../../../core/works/work-rules';
import { WorksService } from '../../../core/works/works.service';

/** HU-011: the participant's works with their status and the latest feedback. */
@Component({
  selector: 'app-my-works-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './my-works-page.html',
  host: { class: 'page-content' },
})
export class MyWorksPage {
  protected readonly user = inject(AuthService).user;
  protected readonly today = new Date();

  protected readonly statusLabels = WORK_STATUS_LABELS;
  protected readonly statusChips = WORK_STATUS_CHIPS;
  protected readonly resultLabels = REVIEW_RESULT_LABELS;
  protected readonly resultChips = REVIEW_RESULT_CHIPS;

  protected readonly works = signal<MyWorkDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    inject(WorksService)
      .mine()
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
