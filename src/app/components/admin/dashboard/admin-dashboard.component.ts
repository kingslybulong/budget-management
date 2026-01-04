import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetService, ExpenseService, AllowanceService } from '../../../services';
import { BudgetCardComponent, StatsCardComponent, ChartComponent } from '../../../shared/components';
import { PesoPipe } from '../../../shared/pipes';
import { ChartConfiguration } from 'chart.js';

/**
 * Admin Dashboard - Full access view for budget holder
 *
 * TODO (PART 7): Add quick actions panel
 * TODO (PART 8): Add notifications/alerts section
 */
@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, FormsModule, BudgetCardComponent, StatsCardComponent, ChartComponent, PesoPipe],
  styles: [`
    /* Mobile-first responsive styles */
    .page-header {
      margin-bottom: 1.5rem;
    }

    .page-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .page-header p {
      font-size: 0.875rem;
      margin-bottom: 0;
    }

    /* Quick action cards for mobile */
    .quick-actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .quick-action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem 0.5rem;
      background: white;
      border-radius: 1rem;
      text-decoration: none;
      color: inherit;
      border: 2px solid #e9ecef;
      transition: all 0.2s;
      text-align: center;
    }

    .quick-action-card:hover {
      border-color: #0d6efd;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .quick-action-card i {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .quick-action-card span {
      font-size: 0.75rem;
      font-weight: 600;
    }

    .quick-action-card.primary { border-color: #0d6efd; color: #0d6efd; }
    .quick-action-card.success { border-color: #198754; color: #198754; }
    .quick-action-card.info { border-color: #0dcaf0; color: #0dcaf0; }
    .quick-action-card.warning { border-color: #ffc107; color: #cc9a00; }
    .quick-action-card.secondary { border-color: #6c757d; color: #6c757d; }

    /* Desktop navigation - hide on mobile */
    .desktop-nav {
      display: none;
    }

    /* Mobile navigation - show on mobile */
    .mobile-nav {
      display: block;
    }

    @media (min-width: 768px) {
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .page-header h1 {
        font-size: 1.75rem;
      }

      .quick-actions {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (min-width: 992px) {
      .desktop-nav {
        display: flex;
        gap: 0.5rem;
      }

      .mobile-nav {
        display: none;
      }

      .quick-actions {
        grid-template-columns: repeat(5, 1fr);
      }
    }

    /* Alert improvements for mobile */
    .alert {
      font-size: 0.875rem;
    }

    @media (max-width: 576px) {
      .alert {
        padding: 0.75rem 1rem;
      }

      .alert .bi {
        font-size: 1rem !important;
      }
    }
  `],
  template: `
    <div class="container-fluid py-3 py-md-4">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p class="text-muted">Welcome back! Here's your budget overview.</p>
        </div>
        <!-- Desktop Navigation -->
        <div class="desktop-nav">
          <a routerLink="/admin/users" class="btn btn-outline-info btn-sm">
            <i class="bi bi-people me-1"></i> Users
          </a>
          <a routerLink="/admin/expenses/create" class="btn btn-outline-success btn-sm">
            <i class="bi bi-plus-circle me-1"></i> Add Expense
          </a>
          <a routerLink="/admin/budget" class="btn btn-outline-primary btn-sm">
            <i class="bi bi-gear me-1"></i> Manage Budget
          </a>
          <a routerLink="/admin/recurring" class="btn btn-outline-secondary btn-sm">
            <i class="bi bi-arrow-repeat me-1"></i> Recurring
          </a>
          <a routerLink="/admin/expenses" class="btn btn-primary btn-sm">
            <i class="bi bi-receipt me-1"></i> Review Expenses
          </a>
        </div>
      </div>

      <!-- Mobile Quick Actions -->
      <div class="mobile-nav">
        <div class="quick-actions">
          <a routerLink="/admin/users" class="quick-action-card info">
            <i class="bi bi-people"></i>
            <span>Users</span>
          </a>
          <a routerLink="/admin/expenses/create" class="quick-action-card success">
            <i class="bi bi-plus-circle"></i>
            <span>Add Expense</span>
          </a>
          <a routerLink="/admin/budget" class="quick-action-card primary">
            <i class="bi bi-gear"></i>
            <span>Manage Budget</span>
          </a>
          <a routerLink="/admin/recurring" class="quick-action-card secondary">
            <i class="bi bi-arrow-repeat"></i>
            <span>Recurring</span>
          </a>
          <a routerLink="/admin/expenses" class="quick-action-card warning">
            <i class="bi bi-receipt"></i>
            <span>Review Expenses</span>
          </a>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="row g-3 mb-4">
        <div class="col-md-6 col-lg-3">
          <app-stats-card
            label="Monthly Budget"
            [value]="currentBudgetAmount() | peso"
            icon="bi-cash-coin"
            color="primary"
          />
        </div>
        <div class="col-md-6 col-lg-3">
          <app-stats-card
            label="Total Spent"
            [value]="currentSpent() | peso"
            icon="bi-cart"
            color="warning"
          />
        </div>
        <div class="col-md-6 col-lg-3">
          <app-stats-card
            label="Remaining"
            [value]="currentRemaining() | peso"
            icon="bi-wallet2"
            [color]="remainingColor()"
          />
        </div>
        <div class="col-md-6 col-lg-3">
          <app-stats-card
            label="Pending Requests"
            [value]="pendingCount().toString()"
            [subtitle]="pendingAmount() | peso"
            icon="bi-hourglass-split"
            color="danger"
          />
        </div>
      </div>

      <!-- Alerts Section -->
      @if (overBudgetCategories().length > 0) {
        <div class="alert alert-danger d-flex align-items-center mb-4" role="alert">
          <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
          <div>
            <strong>Over Budget Alert!</strong>
            {{ overBudgetCategories().length }} category(ies) have exceeded their limit:
            {{ overBudgetCategoryNames() }}
          </div>
        </div>
      }

      @if (warningCategories().length > 0) {
        <div class="alert alert-warning d-flex align-items-center mb-4" role="alert">
          <i class="bi bi-exclamation-circle me-2 fs-5"></i>
          <div>
            <strong>Warning!</strong>
            {{ warningCategories().length }} category(ies) are approaching their limit (80%+):
            {{ warningCategoryNames() }}
          </div>
        </div>
      }

      <!-- Budget Categories -->
      <div class="row g-3 mb-4">
        <div class="col-12">
          <h5 class="mb-3">
            <i class="bi bi-pie-chart me-2"></i>Budget Categories
          </h5>
        </div>
        @for (category of budgetCategories(); track category.id) {
          <div class="col-md-6 col-lg-4">
            <app-budget-card
              [title]="category.name"
              [spent]="category.spent"
              [limit]="category.monthlyLimit"
              [icon]="category.icon || 'bi-folder'"
              [color]="category.color || 'primary'"
              [warningThreshold]="category.warningThreshold"
            />
          </div>
        }
      </div>

      <!-- Charts Row -->
      <div class="row g-3 mb-4">
        <div class="col-lg-8">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white">
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h6 class="mb-0">
                  <i class="bi bi-graph-up me-2"></i>Spending Trend
                </h6>
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <div class="d-flex align-items-center gap-1">
                    <label class="form-label mb-0 small text-muted">From:</label>
                    <select class="form-select form-select-sm" style="width: auto;" [ngModel]="fromMonth()" (ngModelChange)="fromMonth.set($event)">
                      @for (month of months; track month.value) {
                        <option [value]="month.value">{{ month.label }}</option>
                      }
                    </select>
                    <select class="form-select form-select-sm" style="width: auto;" [ngModel]="fromYear()" (ngModelChange)="fromYear.set($event)">
                      @for (year of availableYears(); track year) {
                        <option [value]="year">{{ year }}</option>
                      }
                    </select>
                  </div>
                  <div class="d-flex align-items-center gap-1">
                    <label class="form-label mb-0 small text-muted">To:</label>
                    <select class="form-select form-select-sm" style="width: auto;" [ngModel]="toMonth()" (ngModelChange)="toMonth.set($event)">
                      @for (month of months; track month.value) {
                        <option [value]="month.value">{{ month.label }}</option>
                      }
                    </select>
                    <select class="form-select form-select-sm" style="width: auto;" [ngModel]="toYear()" (ngModelChange)="toYear.set($event)">
                      @for (year of availableYears(); track year) {
                        <option [value]="year">{{ year }}</option>
                      }
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-body">
              <app-chart
                type="bar"
                [data]="spendingChartData()"
                [options]="barChartOptions"
                height="280px"
              />
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white">
              <h6 class="mb-0">
                <i class="bi bi-pie-chart me-2"></i>Category Breakdown
              </h6>
            </div>
            <div class="card-body">
              <app-chart
                type="doughnut"
                [data]="categoryChartData()"
                [options]="doughnutChartOptions"
                height="280px"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Expenses Table -->
      <div class="card shadow-sm">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="bi bi-clock-history me-2"></i>Pending Expense Requests
          </h6>
          <a routerLink="/admin/expenses" class="btn btn-sm btn-outline-primary">
            View All
          </a>
        </div>
        <div class="card-body p-0">
          @if (pendingExpenses().length === 0) {
            <div class="text-center py-5 text-muted">
              <i class="bi bi-check-circle fs-1 mb-2 d-block"></i>
              <p class="mb-0">No pending expense requests</p>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Requested By</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th class="text-end">Amount</th>
                    <th>Date</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (expense of pendingExpenses().slice(0, 5); track expense.id) {
                    <tr>
                      <td>
                        <i class="bi bi-person-circle me-2"></i>
                        {{ expense.userName }}
                      </td>
                      <td>
                        <span class="badge bg-secondary">{{ expense.category }}</span>
                      </td>
                      <td>{{ expense.description }}</td>
                      <td class="text-end fw-semibold">{{ expense.amount | peso }}</td>
                      <td>{{ expense.date | date:'MMM d, y' }}</td>
                      <td class="text-center">
                        <a routerLink="/admin/expenses" class="btn btn-sm btn-primary">
                          Review
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminDashboardComponent {
  private readonly budgetService = inject(BudgetService);
  private readonly expenseService = inject(ExpenseService);
  private readonly allowanceService = inject(AllowanceService);

  // Date range selection for spending trend chart
  protected readonly months = [
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dec' },
  ];

  // Initialize with last 6 months range
  private readonly now = new Date();
  private readonly sixMonthsAgo = new Date(this.now.getFullYear(), this.now.getMonth() - 5, 1);

  protected readonly fromMonth = signal(this.sixMonthsAgo.getMonth() + 1);
  protected readonly fromYear = signal(this.sixMonthsAgo.getFullYear());
  protected readonly toMonth = signal(this.now.getMonth() + 1);
  protected readonly toYear = signal(this.now.getFullYear());

  // Generate available years (current year and 2 years back)
  protected readonly availableYears = computed(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  });

  // Budget data
  protected readonly currentBudgetAmount = this.budgetService.currentBudgetAmount;
  protected readonly currentSpent = this.budgetService.currentSpent;
  protected readonly currentRemaining = this.budgetService.currentRemaining;

  // Dynamic color for remaining balance
  protected readonly remainingColor = computed(() => this.currentRemaining() < 0 ? 'danger' : 'success');
  protected readonly warningCategories = this.budgetService.warningCategories;
  protected readonly overBudgetCategories = this.budgetService.overBudgetCategories;

  protected readonly budgetCategories = computed(() => {
    const budget = this.budgetService.currentBudget();
    return budget?.categories ?? [];
  });

  // Category names for alerts (avoid arrow functions in template)
  protected readonly overBudgetCategoryNames = computed(() =>
    this.overBudgetCategories().map((c) => c.name).join(', ')
  );

  protected readonly warningCategoryNames = computed(() =>
    this.warningCategories().map((c) => c.name).join(', ')
  );

  // Expense data
  protected readonly pendingExpenses = this.expenseService.pendingExpenses;
  protected readonly pendingCount = computed(() => this.pendingExpenses().length);
  protected readonly pendingAmount = this.expenseService.totalPendingAmount;

  // Chart configurations
  protected readonly barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  protected readonly doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' },
    },
  };

  // Chart data
  protected readonly spendingChartData = computed<ChartConfiguration['data']>(() => {
    const history = this.budgetService.getSpendingHistoryRange(
      this.fromMonth(),
      this.fromYear(),
      this.toMonth(),
      this.toYear()
    );
    return {
      labels: history.map((h) => h.month),
      datasets: [
        {
          label: 'Spent',
          data: history.map((h) => h.amount ?? 0),
          backgroundColor: 'rgba(220, 53, 69, 0.7)',
          borderColor: 'rgb(220, 53, 69)',
          borderWidth: 1,
        },
        {
          label: 'Budget',
          data: history.map((h) => h.limit ?? 0),
          backgroundColor: 'rgba(13, 110, 253, 0.3)',
          borderColor: 'rgb(13, 110, 253)',
          borderWidth: 1,
        },
      ],
    };
  });

  protected readonly categoryChartData = computed<ChartConfiguration['data']>(() => {
    const categories = this.budgetCategories();
    return {
      labels: categories.map((c) => c.name),
      datasets: [
        {
          data: categories.map((c) => c.spent),
          backgroundColor: categories.map((c) => this.getChartColor(c.color || 'primary')),
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };
  });

  /** Map Bootstrap/custom color names to rgba values for charts */
  private getChartColor(color: string): string {
    const colorMap: Record<string, string> = {
      'primary': 'rgba(13, 110, 253, 0.8)',
      'success': 'rgba(25, 135, 84, 0.8)',
      'warning': 'rgba(255, 193, 7, 0.8)',
      'danger': 'rgba(220, 53, 69, 0.8)',
      'info': 'rgba(13, 202, 240, 0.8)',
      'secondary': 'rgba(108, 117, 125, 0.8)',
      'purple': 'rgba(111, 66, 193, 0.8)',
      'pink': 'rgba(214, 51, 132, 0.8)',
      'orange': 'rgba(253, 126, 20, 0.8)',
      'teal': 'rgba(32, 201, 151, 0.8)',
      'indigo': 'rgba(102, 16, 242, 0.8)',
      'brown': 'rgba(121, 85, 72, 0.8)',
      'lime': 'rgba(132, 204, 22, 0.8)',
      'coral': 'rgba(255, 107, 107, 0.8)',
      'navy': 'rgba(0, 31, 63, 0.8)',
    };
    return colorMap[color] || colorMap['primary'];
  }
}
