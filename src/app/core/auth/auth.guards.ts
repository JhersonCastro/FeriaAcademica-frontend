import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EventRole } from '../models/user';
import { AuthService } from './auth.service';
import { safeReturnUrl } from './return-url';

/** Requires an open session; otherwise goes to login and comes back afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Login is pointless with an open session: continue to where the user was going. */
export const guestGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated()
    ? router.parseUrl(safeReturnUrl(route.queryParamMap.get('returnUrl')))
    : true;
};

export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isSuperAdmin() ? true : router.createUrlTree(['/unauthorized']);
};

/** Requires `role` in the event given by the `:eventId` route parameter. */
export function eventRoleGuard(role: EventRole): CanActivateFn {
  return (route) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const eventId = route.paramMap.get('eventId');
    return eventId && auth.hasEventRole(eventId, role)
      ? true
      : router.createUrlTree(['/unauthorized']);
  };
}
