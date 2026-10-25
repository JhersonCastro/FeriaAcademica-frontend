import { HttpContextToken } from '@angular/common/http';

/** Lets a request handle its own 401 instead of being sent to the login page. */
export const SKIP_UNAUTHORIZED_REDIRECT = new HttpContextToken<boolean>(() => false);
