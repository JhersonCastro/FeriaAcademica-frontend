import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/api/api-error';
import {
  MAX_QUESTION_LENGTH,
  MAX_QUESTIONS,
  MAX_TEXT_ANSWER_LENGTH,
  QUESTION_TYPES,
  QUESTION_TYPE_HINTS,
  QUESTION_TYPE_LABELS,
  QuestionDraft,
  SCALE_MAX_OPTIONS,
  SCALE_MIN_OPTIONS,
  SUGGESTED_QUESTIONS,
  draftsFrom,
  moveItem,
  newDraft,
  questionError,
  questionsChanged,
  scaleValues,
  toSaveRequest,
} from '../../../core/evaluation/evaluation-rules';
import { EvaluationService } from '../../../core/evaluation/evaluation.service';
import { EventEvaluationDto, QuestionType } from '../../../core/models/evaluation';

type ViewState = 'loading' | 'ready' | 'error';

/**
 * HU-023: a coordinator or teacher defines the fair's evaluation questions: answered on a scale,
 * with yes or no, or in writing. They are optional (a fair may have none) and can be changed
 * until the fair is closed and people answered.
 */
@Component({
  selector: 'app-evaluation-questions-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './evaluation-questions-page.html',
  styleUrl: './evaluation-questions-page.css',
  host: { class: 'page-content' },
})
export class EvaluationQuestionsPage {
  private readonly api = inject(EvaluationService);
  private readonly eventId = inject(ActivatedRoute).snapshot.paramMap.get('eventId') ?? '';

  protected readonly maxQuestions = MAX_QUESTIONS;
  protected readonly maxLength = MAX_QUESTION_LENGTH;
  protected readonly maxTextAnswer = MAX_TEXT_ANSWER_LENGTH;
  protected readonly types = QUESTION_TYPES;
  protected readonly typeLabels = QUESTION_TYPE_LABELS;
  protected readonly typeHints = QUESTION_TYPE_HINTS;
  protected readonly minOptions = SCALE_MIN_OPTIONS;
  protected readonly maxOptions = SCALE_MAX_OPTIONS;
  protected readonly scaleValues = scaleValues;
  protected readonly questionError = questionError;

  protected readonly state = signal<ViewState>('loading');
  protected readonly evaluation = signal<EventEvaluationDto | null>(null);
  protected readonly drafts = signal<QuestionDraft[]>([]);
  protected readonly attempted = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly savedMessage = signal<string | null>(null);

  protected readonly canEdit = computed(() => this.evaluation()?.canEdit ?? false);
  protected readonly dirty = computed(() => {
    const evaluation = this.evaluation();
    return evaluation ? questionsChanged(this.drafts(), evaluation.questions) : false;
  });
  protected readonly invalidCount = computed(
    () => this.drafts().filter((draft) => questionError(draft) !== null).length,
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.errorMessage.set(null);
    this.api.get(this.eventId).subscribe({
      next: (evaluation) => this.useSaved(evaluation),
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.state.set('error');
      },
    });
  }

  protected add(): void {
    if (this.drafts().length >= MAX_QUESTIONS) {
      return;
    }
    this.drafts.update((list) => [...list, newDraft()]);
    this.savedMessage.set(null);
  }

  protected addSuggested(): void {
    this.drafts.update((list) => [
      ...list,
      ...SUGGESTED_QUESTIONS.slice(0, MAX_QUESTIONS - list.length).map(({ text, type }) =>
        newDraft(text, type),
      ),
    ]);
    this.savedMessage.set(null);
  }

  protected remove(key: string): void {
    this.drafts.update((list) => list.filter((draft) => draft.key !== key));
    this.savedMessage.set(null);
  }

  protected move(index: number, delta: -1 | 1): void {
    this.drafts.update((list) => moveItem(list, index, delta));
    this.savedMessage.set(null);
  }

  protected onText(key: string, event: Event): void {
    this.patch(key, { text: (event.target as HTMLTextAreaElement).value });
  }

  protected onType(key: string, type: QuestionType): void {
    this.patch(key, { type });
  }

  protected onScale(key: string, end: 'scaleMin' | 'scaleMax', event: Event): void {
    this.patch(key, { [end]: Number((event.target as HTMLSelectElement).value) });
  }

  protected discard(): void {
    const evaluation = this.evaluation();
    if (evaluation) {
      this.drafts.set(draftsFrom(evaluation.questions));
      this.attempted.set(false);
      this.actionError.set(null);
    }
  }

  protected save(): void {
    this.attempted.set(true);
    this.savedMessage.set(null);
    if (this.invalidCount() > 0 || !this.canEdit()) {
      return;
    }
    const questions = toSaveRequest(this.drafts());
    this.saving.set(true);
    this.actionError.set(null);
    this.api.save(this.eventId, questions).subscribe({
      next: () => {
        // Reload: new questions get their ids from the backend.
        this.api.get(this.eventId).subscribe({
          next: (evaluation) => {
            this.saving.set(false);
            this.useSaved(evaluation);
            this.savedMessage.set(
              questions.length
                ? 'Preguntas guardadas. Quienes asistan podrán responderlas cuando la feria se cierre.'
                : 'Guardado: la feria quedó sin preguntas de evaluación.',
            );
          },
          error: () => {
            this.saving.set(false);
            this.load();
          },
        });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.actionError.set(apiErrorMessage(error));
      },
    });
  }

  private useSaved(evaluation: EventEvaluationDto): void {
    this.evaluation.set(evaluation);
    this.drafts.set(draftsFrom(evaluation.questions));
    this.attempted.set(false);
    this.state.set('ready');
  }

  private patch(key: string, change: Partial<QuestionDraft>): void {
    this.drafts.update((list) =>
      list.map((draft) => (draft.key === key ? { ...draft, ...change } : draft)),
    );
    this.savedMessage.set(null);
  }
}
