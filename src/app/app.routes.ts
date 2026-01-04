import { Routes } from '@angular/router';
import { authGuard, loginGuard, adminGuard, userGuard, viewerGuard } from './guards';

/**
 * Application routes with role-based guards
 *
 * Route structure:
 * - /login - Public login page
 * - /admin/* - Admin-only routes (full access)
 * - /user/* - User routes (submit requests, view allowance)
 * - /viewer/* - Viewer routes (read-only access)
 *
 * TODO (PART 7): Add admin sub-routes (budget, expenses, allowances, recurring)
 * TODO (PART 9): Add user sub-routes (request, history, allowance)
 * TODO (PART 11): Add viewer sub-routes (budget, expenses, analytics)
 */
export const routes: Routes = [
  // Default redirect
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  // Login route (public, redirects if already logged in)
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./components/auth/login/login.component').then((m) => m.LoginComponent),
  },

  // Admin routes (Admin only)
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./components/admin/expenses/expense-approval.component').then(
            (m) => m.ExpenseApprovalComponent
          ),
      },
      {
        path: 'budget',
        loadComponent: () =>
          import('./components/admin/budget/budget-management.component').then(
            (m) => m.BudgetManagementComponent
          ),
      },
      {
        path: 'allowances',
        loadComponent: () =>
          import('./components/admin/allowances/allowance-management.component').then(
            (m) => m.AllowanceManagementComponent
          ),
      },
      {
        path: 'recurring',
        loadComponent: () =>
          import('./components/admin/recurring/recurring-expenses.component').then(
            (m) => m.RecurringExpensesComponent
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./components/admin/users/user-management.component').then(
            (m) => m.UserManagementComponent
          ),
      },
      {
        path: 'expenses/create',
        loadComponent: () =>
          import('./components/admin/expenses/admin-expense-create.component').then(
            (m) => m.AdminExpenseCreateComponent
          ),
      },
    ],
  },

  // User routes (Users and Admins)
  {
    path: 'user',
    canActivate: [userGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/user/dashboard/user-dashboard.component').then(
            (m) => m.UserDashboardComponent
          ),
      },
      {
        path: 'request',
        loadComponent: () =>
          import('./components/user/expense-request/expense-request.component').then(
            (m) => m.ExpenseRequestComponent
          ),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./components/user/expense-history/expense-history.component').then(
            (m) => m.ExpenseHistoryComponent
          ),
      },
      {
        path: 'allowance',
        loadComponent: () =>
          import('./components/user/allowance-details/allowance-details.component').then(
            (m) => m.AllowanceDetailsComponent
          ),
      },
    ],
  },

  // Viewer routes (Viewers, Users, and Admins - READ ONLY)
  {
    path: 'viewer',
    canActivate: [viewerGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/viewer/dashboard/viewer-dashboard.component').then(
            (m) => m.ViewerDashboardComponent
          ),
      },
      {
        path: 'budget',
        loadComponent: () =>
          import('./components/viewer/budget-view/budget-view.component').then(
            (m) => m.BudgetViewComponent
          ),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./components/viewer/expenses-view/expenses-view.component').then(
            (m) => m.ExpensesViewComponent
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./components/viewer/analytics-view/analytics-view.component').then(
            (m) => m.AnalyticsViewComponent
          ),
      },
    ],
  },

  // Wildcard redirect to login
  {
    path: '**',
    redirectTo: 'login',
  },
];
