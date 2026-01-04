import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BudgetService, ExpenseService, AllowanceService } from '../../../services';
import { ChartComponent } from '../../../shared/components';
import { PesoPipe } from '../../../shared/pipes';
import { ChartConfiguration } from 'chart.js';

/**
 * Analytics View Component - Charts and reports for viewers
 */
@Component({
  selector: 'app-analytics-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ FormsModule, ChartComponent, PesoPipe],
  template: `
    <div class="container-fluid py-4">
      <!-- Page Header -->
      <div class="mb-4">
        <h1 class="h3 mb-1">Analytics & Reports</h1>
        <p class="text-muted mb-0">View spending trends and financial insights.</p>
      </div>

      <!-- Period Selector -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-auto">
              <label class="form-label mb-0">Viewing:</label>
            </div>
            <div class="col-auto">
              <select class="form-select" [(ngModel)]="selectedYear" (ngModelChange)="onYearChange()">
                @for (year of availableYears; track year) {
                  <option [value]="year">{{ year }}</option>
                }
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Key Metrics -->
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card bg-primary bg-opacity-10 border-primary h-100">
            <div class="card-body text-center">
              <h3 class="text-primary mb-1">{{ yearlyBudget() | peso }}</h3>
              <small class="text-muted">Total Budget ({{ selectedYear }})</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-warning bg-opacity-10 border-warning h-100">
            <div class="card-body text-center">
              <h3 class="text-warning mb-1">{{ yearlySpending() | peso }}</h3>
              <small class="text-muted">Total Spending</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-success bg-opacity-10 border-success h-100">
            <div class="card-body text-center">
              <h3 class="text-success mb-1">{{ yearlySavings() | peso }}</h3>
              <small class="text-muted">Total Savings</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-info bg-opacity-10 border-info h-100">
            <div class="card-body text-center">
              <h3 class="text-info mb-1">{{ savingsRate() }}%</h3>
              <small class="text-muted">Savings Rate</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="row g-4 mb-4">
        <!-- Monthly Spending Trend -->
        <div class="col-lg-8">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white">
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h6 class="mb-0">
                  <i class="bi bi-graph-up me-2"></i>Monthly Spending Trend
                </h6>
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <div class="d-flex align-items-center gap-1">
                    <label class="form-label mb-0 small text-muted">From:</label>
                    <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="fromMonth">
                      @for (month of months; track month.value) {
                        <option [value]="month.value">{{ month.label }}</option>
                      }
                    </select>
                    <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="fromYear">
                      @for (year of trendYears; track year) {
                        <option [value]="year">{{ year }}</option>
                      }
                    </select>
                  </div>
                  <div class="d-flex align-items-center gap-1">
                    <label class="form-label mb-0 small text-muted">To:</label>
                    <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="toMonth">
                      @for (month of months; track month.value) {
                        <option [value]="month.value">{{ month.label }}</option>
                      }
                    </select>
                    <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="toYear">
                      @for (year of trendYears; track year) {
                        <option [value]="year">{{ year }}</option>
                      }
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-body">
              <app-chart
                type="line"
                [data]="monthlyTrendData()"
                [options]="lineChartOptions"
                height="300px"
              />
            </div>
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white">
              <h6 class="mb-0">
                <i class="bi bi-pie-chart me-2"></i>Spending by Category
              </h6>
            </div>
            <div class="card-body">
              <app-chart
                type="doughnut"
                [data]="categoryBreakdownData()"
                [options]="doughnutChartOptions"
                height="300px"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- More Charts -->
      <div class="row g-4 mb-4">
        <!-- Income vs Expenses -->
        <div class="col-lg-6">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white">
              <h6 class="mb-0">
                <i class="bi bi-bar-chart me-2"></i>Income vs Expenses
              </h6>
            </div>
            <div class="card-body">
              <app-chart
                type="bar"
                [data]="incomeVsExpensesData()"
                [options]="barChartOptions"
                height="280px"
              />
            </div>
          </div>
        </div>

        <!-- User Spending Comparison -->
        <div class="col-lg-6">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white">
              <h6 class="mb-0">
                <i class="bi bi-people me-2"></i>Spending by Family Member
              </h6>
            </div>
            <div class="card-body">
              <app-chart
                type="bar"
                [data]="userSpendingData()"
                [options]="horizontalBarOptions"
                height="280px"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Insights -->
      <div class="card shadow-sm">
        <div class="card-header bg-white">
          <h6 class="mb-0">
            <i class="bi bi-lightbulb me-2"></i>Quick Insights
          </h6>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <div class="border rounded p-3 h-100">
                <h6 class="text-muted mb-2">Highest Spending Category</h6>
                <p class="h5 mb-0 text-primary">{{ highestCategory() }}</p>
              </div>
            </div>
            <div class="col-md-4">
              <div class="border rounded p-3 h-100">
                <h6 class="text-muted mb-2">Average Monthly Spending</h6>
                <p class="h5 mb-0 text-warning">{{ averageMonthlySpending() | peso }}</p>
              </div>
            </div>
            <div class="col-md-4">
              <div class="border rounded p-3 h-100">
                <h6 class="text-muted mb-2">Most Active User</h6>
                <p class="h5 mb-0 text-info">{{ mostActiveUser() }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Notice -->
      <div class="alert alert-info mt-4 mb-0">
        <i class="bi bi-info-circle me-2"></i>
        <strong>Analytics View:</strong> These charts show historical spending patterns and trends.
      </div>
    </div>
  `,
})
export class AnalyticsViewComponent {
  private readonly budgetService = inject(BudgetService);
  private readonly expenseService = inject(ExpenseService);

  protected selectedYear = new Date().getFullYear();
  protected readonly availableYears = [2024, 2025, 2026];

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

  protected fromMonth = this.sixMonthsAgo.getMonth() + 1;
  protected fromYear = this.sixMonthsAgo.getFullYear();
  protected toMonth = this.now.getMonth() + 1;
  protected toYear = this.now.getFullYear();

  // Generate available years for trend chart
  protected readonly trendYears = [
    new Date().getFullYear() - 2,
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
  ];

  /** Chart options */
  protected readonly lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true },
    },
  };

  protected readonly doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  protected readonly barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true } },
  };

  protected readonly horizontalBarOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  protected onYearChange(): void {
    // Trigger reactivity
  }

  /** Key metrics */
  protected yearlyBudget(): number {
    return this.budgetService.getYearlyBudget(this.selectedYear);
  }

  protected yearlySpending(): number {
    return this.budgetService.getYearlySpending(this.selectedYear);
  }

  protected yearlySavings(): number {
    return this.yearlyBudget() - this.yearlySpending();
  }

  protected savingsRate(): number {
    const budget = this.yearlyBudget();
    if (budget === 0) return 0;
    return Math.round((this.yearlySavings() / budget) * 100);
  }

  /** Chart data */
  protected monthlyTrendData(): ChartConfiguration['data'] {
    const history = this.budgetService.getSpendingHistoryRange(
      this.fromMonth,
      this.fromYear,
      this.toMonth,
      this.toYear
    );
    return {
      labels: history.map((h) => h.month),
      datasets: [
        {
          label: 'Spending',
          data: history.map((h) => h.amount),
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }

  protected categoryBreakdownData(): ChartConfiguration['data'] {
    const categories = this.budgetService.currentBudget()?.categories || [];
    return {
      labels: categories.map((c) => c.name),
      datasets: [
        {
          data: categories.map((c) => c.spent),
          backgroundColor: categories.map((c) => this.getChartColor(c.color || 'primary')),
        },
      ],
    };
  }

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

  protected incomeVsExpensesData(): ChartConfiguration['data'] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return {
      labels: months,
      datasets: [
        {
          label: 'Income',
          data: [50000, 50000, 52000, 50000, 55000, 50000],
          backgroundColor: '#198754',
        },
        {
          label: 'Expenses',
          data: [42000, 38000, 45000, 40000, 48000, 43000],
          backgroundColor: '#ffc107',
        },
      ],
    };
  }

  protected userSpendingData(): ChartConfiguration['data'] {
    const expenses = this.expenseService.approvedExpenses();
    const userTotals: Record<string, number> = {};

    expenses.forEach((e) => {
      userTotals[e.userName] = (userTotals[e.userName] || 0) + e.amount;
    });

    const sorted = Object.entries(userTotals).sort((a, b) => b[1] - a[1]);

    return {
      labels: sorted.map(([name]) => name),
      datasets: [
        {
          data: sorted.map(([, amount]) => amount),
          backgroundColor: '#17a2b8',
        },
      ],
    };
  }

  /** Insights */
  protected highestCategory(): string {
    const categories = this.budgetService.currentBudget()?.categories || [];
    if (categories.length === 0) return 'N/A';
    const highest = categories.reduce((max, c) => (c.spent > max.spent ? c : max), categories[0]);
    return highest.name;
  }

  protected averageMonthlySpending(): number {
    const spending = this.yearlySpending();
    const currentMonth = new Date().getMonth() + 1;
    return spending / currentMonth;
  }

  protected mostActiveUser(): string {
    const expenses = this.expenseService.expenses();
    const userCounts: Record<string, number> = {};

    expenses.forEach((e) => {
      userCounts[e.userName] = (userCounts[e.userName] || 0) + 1;
    });

    const sorted = Object.entries(userCounts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'N/A';
  }
}
