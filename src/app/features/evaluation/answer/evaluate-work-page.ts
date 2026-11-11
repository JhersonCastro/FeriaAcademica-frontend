import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api-error';
import {
  AnswerTexts,
  AnswerValues,
  MAX_TEXT_ANSWER_LENGTH,
  NO,
  YES,
  nextPendingWork,
  scaleValues,
  sortByOrder,
  toAnswers,
} from '../../../core/evaluation/evaluation-rules';
import { EvaluationService } from '../../../core/evaluation/evaluation.service';
import {
  EvaluableWorkDto,
  EvaluationQuestionDto,
  MyWorkAnswersDto,
} from '../../../core/models/evaluation';

type ViewState = 'loading' | 'ready' | 'error';

/**
 * HU-023: the person answers the fair's questions for one work: on a scale, yes or no, or in
 * writing. Every question is optional, but at least one answer is needed to save; saving again
 * replaces the previous answers.
 */
@Component({
  selector: 'app-evaluate-work-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './evaluate-work-page.html',
  styleUrl: './evaluate-work-page.css',
  host: { class: 'page-content' },
})
export class EvaluateWorkPage {
  private readonly api = inject(EvaluationService);
  private readonly route = inject(ActivatedRoute);

  protected readonly maxText = MAX_TEXT_ANSWER_LENGTH;
  protected readonly scaleValues = scaleValues;
  protected readonly yes = YES;
  protected readonly no = NO;

  protected readonly state = signal<ViewState>('loading');
  protected readonly data = signal<MyWorkAnswersDto | null>(null);
  protected readonly values = signal<AnswerValues>({});
  protected readonly texts = signal<AnswerTexts>({});
  private readonly saved = signal('');
  private readonly otherWorks = signal<EvaluableWorkDto[]>([]);

  protected readonly saving = signal(false);
  protected readonly attempted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly justSaved = signal(false);

  protected readonly questions = computed(() => sortByOrder(this.data()?.questions ?? []));
  protected readonly answers = computed(() =>
    toAnswers(this.questions(), this.values(), this.texts()),
  );
  protected readonly answeredCount = computed(() => this.answers().length);
  protected readonly dirty = computed(() => JSON.stringify(this.answers()) !== this.saved());
  protected readonly next = computed(() => {
    const workId = this.data()?.workId;
    return workId ? nextPendingWork(this.otherWorks(), workId) : null;
  });

  constructor() {
    this.route.paramMap.subscribe((params) =>
      this.load(params.get('eventId') ?? '', params.get('workId') ?? ''),
    );
  }

  protected pick(question: EvaluationQuestionDto, value: number): void {
    this.values.update((values) => ({ ...values, [question.id]: value }));
    this.justSaved.set(false);
  }

  protected clear(question: EvaluationQuestionDto): void {
    this.values.update((values) => ({ ...values, [question.id]: undefined }));
    this.justSaved.set(false);
  }

  protected onText(question: EvaluationQuestionDto, event: Event): void {
    const text = (event.target as HTMLTextAreaElement).value;
    this.texts.update((texts) => ({ ...texts, [question.id]: text }));
    this.justSaved.set(false);
  }

  protected save(): void {
    const data = this.data();
    this.attempted.set(true);
    this.justSaved.set(false);
    if (!data || !this.answers().length) {
      return;
    }
    const answers = this.answers();
    this.saving.set(true);
    this.actionError.set(null);
    this.api.saveAnswers(data.eventId, data.workId, answers).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(JSON.stringify(answers));
        this.data.set({ ...data, answers, answeredAt: new Date().toISOString() });
        this.otherWorks.update((works) =>
          works.map((work) => (work.workId === data.workId ? { ...work, answered: true } : work)),
        );
        this.attempted.set(false);
        this.justSaved.set(true);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.actionError.set(apiErrorMessage(error));
      },
    });
  }

  private load(eventId: string, workId: string): void {
    this.state.set('loading');
    this.errorMessage.set(null);
    this.actionError.set(null);
    this.justSaved.set(false);
    this.attempted.set(false);
    forkJoin({
      mine: this.api.myAnswers(eventId, workId),
      // Only used to suggest the next work: the page works without it.
      pending: this.api.pending().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ mine, pending }) => {
        this.data.set(mine);
        const values: AnswerValues = {};
        const texts: AnswerTexts = {};
        for (const answer of mine.answers) {
          if (answer.value !== null) {
            values[answer.questionId] = answer.value;
          }
          if (answer.text !== null) {
            texts[answer.questionId] = answer.text;
          }
        }
        this.values.set(values);
        this.texts.set(texts);
        this.saved.set(JSON.stringify(toAnswers(mine.questions, values, texts)));
        this.otherWorks.set(pending.find((event) => event.eventId === eventId)?.works ?? []);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.state.set('error');
      },
    });
  }
}
