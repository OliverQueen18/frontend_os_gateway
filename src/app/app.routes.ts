import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { ShellComponent } from './layout/shell/shell';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'transactions',
        canActivate: [permissionGuard],
        data: { permissions: ['TX_READ', 'TX_WRITE'] },
        loadComponent: () =>
          import('./features/transactions/transactions').then((m) => m.TransactionsPage),
      },
      {
        path: 'sms',
        canActivate: [permissionGuard],
        data: { permissions: ['SMS_SEND'] },
        loadComponent: () => import('./features/sms/sms').then((m) => m.SmsPage),
      },
      {
        path: 'gateways',
        canActivate: [permissionGuard],
        data: { permissions: ['GATEWAYS_READ', 'GATEWAYS_WRITE'] },
        loadComponent: () => import('./features/gateways/gateways').then((m) => m.GatewaysPage),
      },
      {
        path: 'gateways/:id',
        canActivate: [permissionGuard],
        data: { permissions: ['GATEWAYS_READ', 'GATEWAYS_WRITE'] },
        loadComponent: () =>
          import('./features/gateways/gateway-detail').then((m) => m.GatewayDetailPage),
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { permissions: ['USERS_READ', 'USERS_WRITE'] },
        loadComponent: () => import('./features/users/users').then((m) => m.UsersPage),
      },
      {
        path: 'operators',
        canActivate: [permissionGuard],
        data: { permissions: ['USSD_WRITE'] },
        loadComponent: () => import('./features/operators/operators').then((m) => m.OperatorsPage),
      },
      {
        path: 'operation-types',
        canActivate: [permissionGuard],
        data: { permissions: ['SETTINGS_WRITE', 'USERS_WRITE', 'ROLES_WRITE'] },
        loadComponent: () =>
          import('./features/operation-types/operation-types').then((m) => m.OperationTypesPage),
      },
      {
        path: 'cancellation-reasons',
        canActivate: [permissionGuard],
        data: { permissions: ['SETTINGS_WRITE', 'USERS_WRITE', 'TX_WRITE'] },
        loadComponent: () =>
          import('./features/cancellation-reasons/cancellation-reasons').then(
            (m) => m.CancellationReasonsPage,
          ),
      },
      {
        path: 'distributors',
        canActivate: [permissionGuard],
        data: { permissions: ['DISTRIBUTORS_READ', 'DISTRIBUTORS_WRITE'] },
        loadComponent: () =>
          import('./features/distributors/distributors').then((m) => m.DistributorsPage),
      },
      {
        path: 'history',
        canActivate: [permissionGuard],
        data: { permissions: ['TX_READ'] },
        loadComponent: () => import('./features/history/history').then((m) => m.HistoryPage),
      },
      {
        path: 'alerts',
        canActivate: [permissionGuard],
        data: { permissions: ['ALERTS_WRITE', 'GATEWAYS_READ'] },
        loadComponent: () => import('./features/alerts/alerts').then((m) => m.AlertsPage),
      },
      {
        path: 'reports',
        canActivate: [permissionGuard],
        data: { permissions: ['REPORTS_READ'] },
        loadComponent: () => import('./features/reports/reports').then((m) => m.ReportsPage),
      },
      {
        path: 'statistics',
        canActivate: [permissionGuard],
        data: { permissions: ['REPORTS_READ'] },
        loadComponent: () =>
          import('./features/statistics/statistics').then((m) => m.StatisticsPage),
      },
      {
        path: 'journal',
        canActivate: [permissionGuard],
        data: { permissions: ['AUDIT_READ'] },
        loadComponent: () => import('./features/journal/journal').then((m) => m.JournalPage),
      },
      {
        path: 'settings',
        canActivate: [permissionGuard],
        data: { permissions: ['SETTINGS_WRITE', 'USERS_WRITE'] },
        loadComponent: () => import('./features/settings/settings').then((m) => m.SettingsPage),
      },
      {
        path: 'admin',
        canActivate: [permissionGuard],
        data: { permissions: ['ROLES_WRITE', 'USERS_WRITE'] },
        loadComponent: () => import('./features/admin/admin').then((m) => m.AdminPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
