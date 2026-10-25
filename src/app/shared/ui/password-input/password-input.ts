import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Password field with a show/hide toggle ("Campo / password" in the design system). */
@Component({
  selector: 'app-password-input',
  template: `
    <div class="control" [class.control--error]="invalid()" [class.control--disabled]="disabled()">
      <input
        class="control__input"
        [id]="inputId()"
        [type]="visible() ? 'text' : 'password'"
        [attr.autocomplete]="autocomplete()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy() || null"
        [value]="value()"
        [disabled]="disabled()"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
      @if (invalid()) {
        <img class="control__icon" src="assets/icons/circle-alert.svg" width="16" height="16" alt="" />
      }
      <button
        type="button"
        class="control__icon-btn"
        [class.is-pressed]="visible()"
        [attr.aria-pressed]="visible()"
        [attr.aria-label]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        [disabled]="disabled()"
        (click)="visible.set(!visible())"
      >
        <img src="assets/icons/eye.svg" width="16" height="16" alt="" />
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PasswordInput), multi: true },
  ],
})
export class PasswordInput implements ControlValueAccessor {
  readonly inputId = input.required<string>();
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  readonly invalid = input(false);
  readonly describedBy = input<string>();

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly visible = signal(false);

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }
}
