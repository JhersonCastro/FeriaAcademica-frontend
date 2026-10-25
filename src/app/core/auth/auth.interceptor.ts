import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_UNAUTHORIZED_REDIRECT } from './auth-context';
import { AuthService } from './auth.service';

/**
 * Sends the session cookie with every API call and, when the backend answers 401
 * (no session, expired, or the account was deactivated), drops the session and goes to login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${environment.apiBaseUrl}/api/`)) {
    return next(req);
  }

  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req.clone({ withCredentials: true })).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.context.get(SKIP_UNAUTHORIZED_REDIRECT)
      ) {
        auth.clearSession();
        const currentUrl = router.url;
        if (!currentUrl.startsWith('/login')) {
          void router.navigate(['/login'], {
            queryParams: { returnUrl: currentUrl, reason: 'session-expired' },
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
