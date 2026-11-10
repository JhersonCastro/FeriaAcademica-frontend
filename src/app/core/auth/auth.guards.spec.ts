import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { routes } from '../../app.routes';
import { EventRoleAssignment, UserDto } from '../models/user';
import { anyEventRoleGuard } from './auth.guards';
import { AuthService } from './auth.service';

const FIET = { eventId: 'a63bf327-3596-4738-a133-7dbd0cd58d0f', eventName: 'FIET 2026' };
const OTHER = { eventId: '0b3a8c0e-9f0c-4f7e-8d57-3f4b2a3d9c11', eventName: 'Feria Empresarial' };

function userWith(eventRoles: EventRoleAssignment[], isSuperAdmin = false): UserDto {
  return {
    id: '5e3c0d52-6d1a-4a8e-9a3e-1f6f3d0b7a10',
    email: 'user@test.edu.co',
    fullName: 'Usuario de prueba',
    phoneNumber: null,
    birthDate: null,
    guardianName: null,
    guardianEmail: null,
    isSuperAdmin,
    status: 'Active',
    createdAt: '2026-10-01T00:00:00Z',
    eventRoles,
  };
}

describe('role guards', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  function signIn(user: UserDto): void {
    auth.login({ email: user.email, password: 'UnaClaveSegura1!', remember: false }).subscribe();
    http.expectOne('/api/auth/login').flush(user);
  }

  function run(guard: CanActivateFn): unknown {
    return TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }

  function redirectTo(result: unknown): string {
    return router.serializeUrl(result as UrlTree);
  }

  /** The guard the route table really declares for a section of the signed-in area. */
  function declaredGuard(path: string): CanActivateFn {
    const route = routes.flatMap((r) => r.children ?? []).find((r) => r.path === path);
    expect(route?.canActivate).toHaveLength(1);
    return route!.canActivate![0] as CanActivateFn;
  }

  describe('anyEventRoleGuard', () => {
    it('lets in whoever holds the role in any event, not only in the first one', () => {
      signIn(
        userWith([
          { ...FIET, role: 'Teacher' },
          { ...OTHER, role: 'Participant' },
        ]),
      );
      expect(run(anyEventRoleGuard('Participant'))).toBe(true);
      expect(run(anyEventRoleGuard('Teacher'))).toBe(true);
    });

    it('sends to /unauthorized whoever does not hold the role', () => {
      signIn(userWith([{ ...FIET, role: 'Teacher' }]));
      expect(redirectTo(run(anyEventRoleGuard('Participant')))).toBe('/unauthorized');
      expect(redirectTo(run(anyEventRoleGuard('Jury')))).toBe('/unauthorized');
    });

    it('does not take the super admin for a participant or a teacher', () => {
      signIn(userWith([], true));
      expect(redirectTo(run(anyEventRoleGuard('Participant')))).toBe('/unauthorized');
      expect(redirectTo(run(anyEventRoleGuard('Teacher')))).toBe('/unauthorized');
    });

    it('sends to /unauthorized when there is no session', () => {
      expect(redirectTo(run(anyEventRoleGuard('Participant')))).toBe('/unauthorized');
    });
  });

  describe('routes of the signed-in area', () => {
    it('/works is for participants, like the "Mis trabajos" link', () => {
      const guard = declaredGuard('works');
      signIn(userWith([{ ...FIET, role: 'Teacher' }]));
      expect(redirectTo(run(guard))).toBe('/unauthorized');

      signIn(
        userWith([
          { ...FIET, role: 'Teacher' },
          { ...OTHER, role: 'Participant' },
        ]),
      );
      expect(run(guard)).toBe(true);
    });

    it('/reviews is for teachers, like the "Revisar trabajos" link', () => {
      const guard = declaredGuard('reviews');
      signIn(userWith([{ ...FIET, role: 'Participant' }]));
      expect(redirectTo(run(guard))).toBe('/unauthorized');

      signIn(
        userWith([
          { ...FIET, role: 'Participant' },
          { ...OTHER, role: 'Teacher' },
        ]),
      );
      expect(run(guard)).toBe(true);
    });
  });
});
