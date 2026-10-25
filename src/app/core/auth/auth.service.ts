import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventRole, LoginRequest, ResetPasswordRequest, UserDto } from '../models/user';
import { SKIP_UNAUTHORIZED_REDIRECT } from './auth-context';

/**
 * Session state backed by the `feria.auth` HttpOnly cookie. Nothing is stored on the client:
 * the current user is always whatever `GET /api/auth/me` says.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/auth`;

  private readonly currentUser = signal<UserDto | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isSuperAdmin = computed(() => this.currentUser()?.isSuperAdmin ?? false);

  /** Called once at startup; resolves to `null` when there is no open session. */
  restoreSession(): Observable<UserDto | null> {
    const context = new HttpContext().set(SKIP_UNAUTHORIZED_REDIRECT, true);
    return this.http.get<UserDto>(`${this.baseUrl}/me`, { context }).pipe(
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      }),
    );
  }

  refreshUser(): Observable<UserDto> {
    return this.http
      .get<UserDto>(`${this.baseUrl}/me`)
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  login(request: LoginRequest): Observable<UserDto> {
    return this.http
      .post<UserDto>(`${this.baseUrl}/login`, request)
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/logout`, {})
      .pipe(finalize(() => this.currentUser.set(null)));
  }

  /** Forgets the local session after the backend reported it as gone (401). */
  clearSession(): void {
    this.currentUser.set(null);
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/forgot-password`, { email });
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reset-password`, request);
  }

  hasEventRole(eventId: string, role: EventRole): boolean {
    return (
      this.currentUser()?.eventRoles.some(
        (assignment) => String(assignment.eventId) === eventId && assignment.role === role,
      ) ?? false
    );
  }
}
