import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { CrestComponent } from '../../shared/crest';
import { IconComponent } from '../../shared/icon';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CrestComponent, IconComponent],
  templateUrl: './login.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  protected verPassword = signal(false);
  protected error = signal<string | null>(null);

  protected form = inject(FormBuilder).nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    recordar: [false],
  });

  protected ingresar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { correo, password, recordar } = this.form.getRawValue();
    this.error.set(this.auth.login(correo, password, recordar));
  }

  protected google() { this.auth.loginGoogle(); }

  protected olvido() { this.toast.mostrar('Se enviará un enlace de recuperación a tu correo institucional.'); }
}
