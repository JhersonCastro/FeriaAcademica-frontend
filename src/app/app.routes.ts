import { Routes } from '@angular/router';
import {
  attendanceStaffGuard,
  authGuard,
  eventRoleGuard,
  guestGuard,
  superAdminGuard,
} from './core/auth/auth.guards';
import { AppShell } from './layout/app-shell/app-shell';
import { PublicLayout } from './layout/public-layout/public-layout';

export const routes: Routes = [
  // Signed-in area. Evaluated first: its guard sends `/` to login. A public layout listed before
  // it would match `/` with no child and render an empty card.
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Inicio',
        loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
      },
      {
        path: 'profile',
        title: 'Mis datos y perfil',
        loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage),
      },
      {
        path: 'admin/users',
        canActivate: [superAdminGuard],
        children: [
          {
            path: '',
            title: 'Usuarios',
            loadComponent: () =>
              import('./features/admin/users/user-list/user-list-page').then(
                (m) => m.UserListPage,
              ),
          },
          {
            path: 'new',
            title: 'Crear usuario',
            loadComponent: () =>
              import('./features/admin/users/user-create/user-create-page').then(
                (m) => m.UserCreatePage,
              ),
          },
          {
            path: ':id',
            title: 'Detalle de usuario',
            loadComponent: () =>
              import('./features/admin/users/user-detail/user-detail-page').then(
                (m) => m.UserDetailPage,
              ),
          },
          {
            path: ':id/edit',
            title: 'Editar usuario',
            loadComponent: () =>
              import('./features/admin/users/user-edit/user-edit-page').then(
                (m) => m.UserEditPage,
              ),
          },
        ],
      },
      {
        path: 'events/:eventId/invitations/new',
        title: 'Invitar a la feria',
        canActivate: [eventRoleGuard('Teacher')],
        loadComponent: () => import('./features/events/invite/invite-page').then((m) => m.InvitePage),
      },
      {
        path: 'my-qr',
        title: 'Mi QR',
        loadComponent: () =>
          import('./features/attendance/my-qr/my-qr-page').then((m) => m.MyQrPage),
      },
      {
        path: 'events/:eventId/attendance',
        canActivate: [attendanceStaffGuard],
        children: [
          {
            path: '',
            title: 'Afluencia',
            loadComponent: () =>
              import('./features/attendance/turnout/turnout-page').then((m) => m.TurnoutPage),
          },
          {
            path: 'scan',
            title: 'Check-in',
            loadComponent: () =>
              import('./features/attendance/scanner/scanner-page').then((m) => m.ScannerPage),
          },
        ],
      },
      {
        path: 'unauthorized',
        title: 'No autorizado',
        loadComponent: () =>
          import('./features/errors/unauthorized-page').then((m) => m.UnauthorizedPage),
      },
    ],
  },

  // Public screens, most of them opened from links in emails.
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: 'login',
        title: 'Inicio de sesión',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/login/login-page').then((m) => m.LoginPage),
      },
      {
        path: 'forgot-password',
        title: 'Recuperar contraseña',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password-page').then(
            (m) => m.ForgotPasswordPage,
          ),
      },
      {
        path: 'account/set-password',
        title: 'Definir contraseña',
        data: { mode: 'set' },
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password-page').then(
            (m) => m.ResetPasswordPage,
          ),
      },
      {
        path: 'account/reset-password',
        title: 'Restablecer contraseña',
        data: { mode: 'reset' },
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password-page').then(
            (m) => m.ResetPasswordPage,
          ),
      },
      {
        path: 'invitations/:token',
        title: 'Aceptar invitación',
        loadComponent: () =>
          import('./features/invitations/accept-invitation/accept-invitation-page').then(
            (m) => m.AcceptInvitationPage,
          ),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
