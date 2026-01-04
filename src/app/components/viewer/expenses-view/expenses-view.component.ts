import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpenseService, BudgetService } from '../../../services';
import { ExpenseStatus } from '../../../models';
import { PesoPipe, CategoryNamePipe } from '../../../shared/pipes';
import { StatusBadgeComponent } from '../../../shared/components';

/**
 * Expenses View Component - Read-only view of all household expenses for viewers
 */
@Component({
  selector: 'app-expenses-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ DatePipe, FormsModule, PesoPipe, CategoryNamePipe, StatusBadgeComponent],
  template: `
    <div class="container-fluid py-4">
      <!-- Page Header -->
      <div class="mb-4">
        <h1 class="h3 mb-1">Expense Records</h1>
        <p class="text-muted mb-0">View all household expense requests and their status.</p>
      </div>

      <!-- Summary Cards -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card bg-primary bg-opacity-10 border-primary h-100">
            <div class="card-body text-center py-3">
              <h4 class="text-primary mb-1">{{ totalExpenses() }}</h4>
              <small class="text-muted">Total Requests</small>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card bg-warning bg-opacity-10 border-warning h-100">
            <div class="card-body text-center py-3">
              <h4 class="text-warning mb-1">{{ pendingCount() }}</h4>
              <small class="text-muted">Pending</small>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card bg-success bg-opacity-10 border-success h-100">
            <div class="card-body text-center py-3">
              <h4 class="text-success mb-1">{{ approvedCount() }}</h4>
              <small class="text-muted">Approved</small>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card bg-danger bg-opacity-10 border-danger h-100">
            <div class="card-body text-center py-3">
              <h4 class="text-danger mb-1">{{ rejectedCount() }}</h4>
              <small class="text-muted">Rejected</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-3">
              <label class="form-label">Filter by Status</label>
              <select class="form-select" [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)">
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">Filter by Category</label>
              <select class="form-select" [ngModel]="filterCategory()" (ngModelChange)="filterCategory.set($event)">
                <option value="all">All Categories</option>
                @for (cat of availableCategories(); track cat.type) {
                  <option [value]="cat.type">{{ cat.name }}</option>
                }
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">Filter by User</label>
              <select class="form-select" [ngModel]="filterUser()" (ngModelChange)="filterUser.set($event)">
                <option value="all">All Users</option>
                @for (user of uniqueUsers(); track user) {
                  <option [value]="user">{{ user }}</option>
                }
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Search</label>
              <input
                type="text"
                class="form-control"
                [ngModel]="searchTerm()"
                (ngModelChange)="searchTerm.set($event)"
                placeholder="Search description..."
              />
            </div>
            <div class="col-md-2">
              <label class="form-label">&nbsp;</label>
              <button class="btn btn-outline-secondary w-100" (click)="clearFilters()">
                <i class="bi bi-x-circle me-1"></i> Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Expenses Table -->
      <div class="card shadow-sm">
        <div class="card-header bg-white">
          <h5 class="mb-0">
            <i class="bi bi-receipt me-2"></i>All Expenses
            <span class="badge bg-secondary ms-2">{{ filteredExpenses().length }}</span>
          </h5>
        </div>
        <div class="card-body p-0">
          @if (filteredExpenses().length === 0) {
            <div class="text-center py-5 text-muted">
              <i class="bi bi-inbox fs-1 mb-2 d-block"></i>
              <p class="mb-0">No expenses match your filters.</p>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Requested By</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th class="text-end">Amount</th>
                    <th class="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (expense of filteredExpenses(); track expense.id) {
                    <tr>
                      <td>{{ expense.date | date:'MMM d, y' }}</td>
                      <td>
                        <i class="bi bi-person-circle me-1"></i>
                        {{ expense.userName }}
                      </td>
                      <td>{{ expense.description }}</td>
                      <td>
                        <span class="badge bg-secondary">{{ expense.category | categoryName }}</span>
                      </td>
                      <td class="text-end fw-semibold">{{ expense.amount | peso }}</td>
                      <td class="text-center">
                        <app-status-badge [status]="expense.status" />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>

      <!-- Total Approved -->
      <div class="card bg-success bg-opacity-10 border-success mt-4">
        <div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-0 text-success">
              <i class="bi bi-check-circle me-2"></i>Total Approved Amount
            </h6>
          </div>
          <h4 class="mb-0 text-success">{{ totalApprovedAmount() | peso }}</h4>
        </div>
      </div>

      <!-- Info Notice -->
      <div class="alert alert-info mt-4 mb-0">
        <i class="bi bi-info-circle me-2"></i>
        <strong>Read-Only View:</strong> This is a read-only view of household expenses.
      </div>
    </div>
  `,
})
export class ExpensesViewComponent {
  private readonly expenseService = inject(ExpenseService);
  private readonly budgetService = inject(BudgetService);

  protected readonly filterStatus = signal('all');
  protected readonly filterCategory = signal('all');
  protected readonly filterUser = signal('all');
  protected readonly searchTerm = signal('');

  protected readonly allExpenses = this.expenseService.expenses;

  /** Get available categories from the current budget */
  protected readonly availableCategories = computed(() => {
    const budget = this.budgetService.currentBudget();
    if (!budget) return [];
    return budget.categories
      .filter(cat => cat.monthlyLimit > 0)
      .map(cat => ({ type: cat.type, name: cat.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly uniqueUsers = computed(() => {
    const users = new Set(this.allExpenses().map((e) => e.userName));
    return Array.from(users).sort();
  });

  protected readonly filteredExpenses = computed(() => {
    let expenses = this.allExpenses();

    // Filter by status
    const status = this.filterStatus();
    if (status !== 'all') {
      const statusMap: Record<string, ExpenseStatus> = {
        pending: ExpenseStatus.PENDING,
        approved: ExpenseStatus.APPROVED,
        rejected: ExpenseStatus.REJECTED,
      };
      const mappedStatus = statusMap[status];
      if (mappedStatus) {
        expenses = expenses.filter((e) => e.status === mappedStatus);
      }
    }

    // Filter by category
    const category = this.filterCategory();
    if (category !== 'all') {
      expenses = expenses.filter((e) => e.category === category);
    }

    // Filter by user
    const user = this.filterUser();
    if (user !== 'all') {
      expenses = expenses.filter((e) => e.userName === user);
    }

    // Filter by search term
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      expenses = expenses.filter((e) =>
        e.description.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term)
      );
    }

    // Sort by date descending
    return expenses.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

  protected totalExpenses(): number {
    return this.allExpenses().length;
  }

  protected pendingCount(): number {
    return this.allExpenses().filter((e) => e.status === ExpenseStatus.PENDING).length;
  }

  protected approvedCount(): number {
    return this.allExpenses().filter((e) => e.status === ExpenseStatus.APPROVED).length;
  }

  protected rejectedCount(): number {
    return this.allExpenses().filter((e) => e.status === ExpenseStatus.REJECTED).length;
  }

  protected totalApprovedAmount(): number {
    return this.allExpenses()
      .filter((e) => e.status === ExpenseStatus.APPROVED)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  protected clearFilters(): void {
    this.filterStatus.set('all');
    this.filterCategory.set('all');
    this.filterUser.set('all');
    this.searchTerm.set('');
  }
}
