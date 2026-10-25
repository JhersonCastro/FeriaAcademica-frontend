import { Component, computed, input } from '@angular/core';
import { evaluatePassword } from '../../forms/password-policy';

type StrengthLevel = 'low' | 'medium' | 'high';

const LEVEL_LABELS: Record<StrengthLevel, string> = {
  low: 'Fortaleza baja',
  medium: 'Fortaleza media',
  high: 'Fortaleza alta',
};

const SEGMENTS = 4;

/** "Medidor de contraseña" plus the alert listing which requirements are still missing. */
@Component({
  selector: 'app-password-strength',
  template: `
    <div class="meter" aria-hidden="true">
      @for (filled of segments(); track $index) {
        <span class="meter__segment" [class]="filled ? 'meter__segment--' + level() : ''"></span>
      }
    </div>
    <div
      class="alert"
      [class.alert--success]="level() === 'high'"
      [class.alert--warning]="level() === 'medium'"
      [class.alert--danger]="level() === 'low'"
      [id]="hintId()"
      aria-live="polite"
    >
      @if (level() === 'high') {
        <img class="alert__icon" src="assets/icons/circle-check.svg" width="20" height="20" alt="" />
      }
      <div class="alert__body">
        <p class="alert__title">{{ levelLabel() }}</p>
        <p>{{ summary() }}</p>
      </div>
    </div>
  `,
  host: { class: 'password-strength' },
})
export class PasswordStrength {
  readonly password = input<string>('');
  readonly hintId = input<string>();

  private readonly checks = computed(() => evaluatePassword(this.password()));
  private readonly metCount = computed(() => this.checks().filter((check) => check.met).length);

  protected readonly level = computed<StrengthLevel>(() => {
    const met = this.metCount();
    if (met === this.checks().length) {
      return 'high';
    }
    return met >= 3 ? 'medium' : 'low';
  });

  protected readonly levelLabel = computed(() => LEVEL_LABELS[this.level()]);

  protected readonly segments = computed(() => {
    const filled = Math.floor((this.metCount() * SEGMENTS) / this.checks().length);
    return Array.from({ length: SEGMENTS }, (_, index) => index < filled);
  });

  protected readonly summary = computed(() => {
    const checks = this.checks();
    if (this.level() === 'high') {
      const rest = checks.filter((check) => check.requirement !== 'length');
      return [`${this.password().length} caracteres`, ...rest.map((check) => check.label)].join(
        ' · ',
      );
    }
    return `Falta: ${checks
      .filter((check) => !check.met)
      .map((check) => (check.requirement === 'length' ? `mínimo ${check.label}` : check.label))
      .join(' · ')}`;
  });
}
