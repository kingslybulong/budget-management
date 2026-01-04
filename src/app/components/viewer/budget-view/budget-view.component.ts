import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../../services';
import { BudgetCardComponent } from '../../../shared/components';
import { PesoPipe } from '../../../shared/pipes';

/**
 * Budget View Component - Read-only view of household budget for viewers
 */
@Component({
  selector: 'app-budget-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ FormsModule, BudgetCardComponent, PesoPipe],
  template: `
    <div class="container-fluid py-4">
      <!-- Page Header -->
      <div class="mb-4">
        <h1 class="h3 mb-1">Budget Overview</h1>
        <p class="text-muted mb-0">View the household budget allocation and spending.</p>
      </div>

      <!-- Month Selector -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-auto">
              <label class="form-label mb-0">Viewing:</label>
            </div>
            <div class="col-auto">
              <select class="form-select" [ngModel]="selectedMonth()" (ngModelChange)="selectedMonth.set(+$event)">
                @for (month of availableMonths; track month.value) {
                  <option [value]="month.value">{{ month.label }}</option>
                }
              </select>
            </div>
            <div class="col-auto">
              <select class="form-select" [ngModel]="selectedYear()" (ngModelChange)="selectedYear.set(+$event)">
                @for (year of availableYears; track year) {
                  <option [value]="year">{{ year }}</option>
                }
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Budget Summary -->
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="card bg-primary bg-opacity-10 border-primary h-100">
            <div class="card-body text-center">
              <h3 class="text-primary mb-1">{{ totalBudgetAmount() | peso }}</h3>
              <small class="text-muted">Monthly Budget</small>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card bg-warning bg-opacity-10 border-warning h-100">
            <div class="card-body text-center">
              <h3 class="text-warning mb-1">{{ totalSpent() | peso }}</h3>
              <small class="text-muted">Total Spent</small>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card bg-success bg-opacity-10 border-success h-100">
            <div class="card-body text-center">
              <h3 class="mb-1" [class.text-success]="remaining() >= 0" [class.text-danger]="remaining() < 0">
                {{ remaining() | peso }}
              </h3>
              <small class="text-muted">Remaining</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Budget Categories -->
      <div class="card shadow-sm">
        <div class="card-header bg-white">
          <h5 class="mb-0">
            <i class="bi bi-pie-chart me-2"></i>Budget Categories
          </h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            @for (category of budgetCategories(); track category.id) {
              <div class="col-md-6 col-lg-4">
                <app-budget-card
                  [title]="category.name"
                  [spent]="category.spent"
                  [limit]="category.monthlyLimit"
                  [icon]="category.icon || 'bi-folder'"
                  [color]="category.color || 'primary'"
                />
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Info Notice -->
      <div class="alert alert-info mt-4 mb-0">
        <i class="bi bi-info-circle me-2"></i>
        <strong>Read-Only View:</strong> This is a read-only view of the household budget.
        Contact an admin to make changes.
      </div>
    </div>
  `,
})
export class BudgetViewComponent {
  private readonly budgetService = inject(BudgetService);

  protected readonly selectedMonth = signal(new Date().getMonth() + 1);
  protected readonly selectedYear = signal(new Date().getFullYear());

  protected readonly availableMonths = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  protected readonly availableYears = [2024, 2025, 2026];

  protected readonly budgetCategories = computed(() => {
    const budget = this.budgetService.getBudget(this.selectedMonth(), this.selectedYear());
    return budget?.categories || [];
  });

  protected readonly totalBudgetAmount = computed(() => {
    const budget = this.budgetService.getBudget(this.selectedMonth(), this.selectedYear());
    return budget?.totalBudget || 0;
  });

  protected readonly totalSpent = computed(() => {
    return this.budgetCategories().reduce((sum, c) => sum + c.spent, 0);
  });

  protected readonly remaining = computed(() => {
    return this.totalBudgetAmount() - this.totalSpent();
  });
}
