import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, ExpenseService } from '../../../services';
import { ExpenseStatus } from '../../../models';
import { PesoPipe, CategoryNamePipe } from '../../../shared/pipes';
import { StatusBadgeComponent } from '../../../shared/components';

/**
 * Expense History Component - User views their expense request history
 */
@Component({
  selector: 'app-expense-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, FormsModule, PesoPipe, CategoryNamePipe, StatusBadgeComponent],
  template: `
    <div class="container-fluid py-4">
      <!-- Page Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="h3 mb-1">My Expense History</h1>
          <p class="text-muted mb-0">View all your expense requests and their status.</p>
        </div>
        <a routerLink="/user/request" class="btn btn-primary">
          <i class="bi bi-plus-circle me-1"></i> New Request
        </a>
      </div>

      <!-- Summary Cards -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card bg-primary bg-opacity-10 border-primary h-100">
            <div class="card-body text-center py-3">
              <h4 class="text-primary mb-1">{{ totalRequests() }}</h4>
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
            <div class="col-md-4">
              <label class="form-label">Filter by Status</label>
              <select class="form-select" [(ngModel)]="filterStatus">
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Search</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="searchTerm"
                placeholder="Search description..."
              />
            </div>
            <div class="col-md-4">
              <button class="btn btn-outline-secondary w-100" (click)="clearFilters()">
                <i class="bi bi-x-circle me-1"></i> Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Expense History Table -->
      <div class="card shadow-sm">
        <div class="card-header bg-white">
          <h5 class="mb-0">
            <i class="bi bi-clock-history me-2"></i>Expense Requests
            <span class="badge bg-secondary ms-2">{{ filteredExpenses().length }}</span>
          </h5>
        </div>
        <div class="card-body p-0">
          @if (filteredExpenses().length === 0) {
            <div class="text-center py-5 text-muted">
              <i class="bi bi-inbox fs-1 mb-2 d-block"></i>
              @if (myExpenses().length === 0) {
                <p class="mb-2">You haven't submitted any expense requests yet.</p>
                <a routerLink="/user/request" class="btn btn-primary btn-sm">
                  <i class="bi bi-plus-circle me-1"></i> Submit Your First Request
                </a>
              } @else {
                <p class="mb-0">No expenses match your filters.</p>
              }
            </div>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th class="text-end">Amount</th>
                    <th class="text-center">Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  @for (expense of filteredExpenses(); track expense.id) {
                    <tr>
                      <td>
                        <div class="d-flex flex-column">
                          <span>{{ expense.date | date:'MMM d, y' }}</span>
                          <small class="text-muted">{{ expense.date | date:'h:mm a' }}</small>
                        </div>
                      </td>
                      <td>
                        <div class="fw-medium">{{ expense.description }}</div>
                      </td>
                      <td>
                        <span class="badge bg-secondary">{{ expense.category | categoryName }}</span>
                      </td>
                      <td class="text-end fw-semibold">{{ expense.amount | peso }}</td>
                      <td class="text-center">
                        <app-status-badge [status]="expense.status" />
                      </td>
                      <td>
                        <button
                          class="btn btn-sm btn-outline-primary"
                          (click)="viewDetails(expense)"
                          title="View Details"
                        >
                          <i class="bi bi-eye"></i>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>

      <!-- Total Approved Amount -->
      @if (totalApprovedAmount() > 0) {
        <div class="card bg-success bg-opacity-10 border-success mt-4">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-0 text-success">
                <i class="bi bi-check-circle me-2"></i>Total Approved This Month
              </h6>
            </div>
            <h4 class="mb-0 text-success">{{ totalApprovedAmount() | peso }}</h4>
          </div>
        </div>
      }

      <!-- Details Modal -->
      @if (showDetailsModal()) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-receipt text-primary me-2"></i>Expense Details
                </h5>
                <button type="button" class="btn-close" (click)="closeDetailsModal()"></button>
              </div>
              @if (selectedExpense()) {
                <div class="modal-body">
                  <div class="mb-3">
                    <label class="form-label text-muted small">Description</label>
                    <p class="mb-0 fw-medium">{{ selectedExpense()!.description }}</p>
                  </div>

                  <div class="row mb-3">
                    <div class="col-6">
                      <label class="form-label text-muted small">Category</label>
                      <p class="mb-0">
                        <span class="badge bg-secondary">{{ selectedExpense()!.category | categoryName }}</span>
                      </p>
                    </div>
                    <div class="col-6">
                      <label class="form-label text-muted small">Amount</label>
                      <p class="mb-0 fw-semibold">{{ selectedExpense()!.amount | peso }}</p>
                    </div>
                  </div>

                  <div class="row mb-3">
                    <div class="col-6">
                      <label class="form-label text-muted small">Submitted On</label>
                      <p class="mb-0">{{ selectedExpense()!.createdAt | date:'MMM d, y, h:mm a' }}</p>
                    </div>
                    <div class="col-6">
                      <label class="form-label text-muted small">Status</label>
                      <p class="mb-0">
                        <app-status-badge [status]="selectedExpense()!.status" />
                      </p>
                    </div>
                  </div>

                  @if (selectedExpense()!.status === ExpenseStatus.APPROVED) {
                    <div class="alert alert-success mb-0">
                      <i class="bi bi-check-circle me-2"></i>
                      <strong>Approved</strong>
                      @if (selectedExpense()!.approvedAt) {
                        on {{ selectedExpense()!.approvedAt | date:'MMM d, y' }}
                      }
                    </div>
                  }

                  @if (selectedExpense()!.status === ExpenseStatus.REJECTED) {
                    <div class="alert alert-danger mb-0">
                      <i class="bi bi-x-circle me-2"></i>
                      <strong>Rejected</strong>
                      @if (selectedExpense()!.rejectionReason) {
                        <p class="mb-0 mt-2">{{ selectedExpense()!.rejectionReason }}</p>
                      }
                    </div>
                  }

                  @if (selectedExpense()!.status === ExpenseStatus.PENDING) {
                    <div class="alert alert-warning mb-0">
                      <i class="bi bi-hourglass-split me-2"></i>
                      <strong>Pending Review</strong>
                      <p class="mb-0 mt-1 small">Your request is waiting for admin approval.</p>
                    </div>
                  }
                </div>
              }
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeDetailsModal()">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ExpenseHistoryComponent {
  private readonly authService = inject(AuthService);
  private readonly expenseService = inject(ExpenseService);

  /** Expose enum to template */
  protected readonly ExpenseStatus = ExpenseStatus;

  /** Filter state */
  protected filterStatus = 'all';
  protected searchTerm = '';

  /** Modal state */
  protected readonly showDetailsModal = signal(false);
  protected readonly selectedExpense = signal<any>(null);

  /** Get current user's expenses */
  protected readonly myExpenses = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return [];
    return this.expenseService.getExpensesByUser(user.id);
  });

  /** Filtered expenses based on status and search */
  protected readonly filteredExpenses = computed(() => {
    let expenses = this.myExpenses();

    // Filter by status
    if (this.filterStatus !== 'all') {
      const statusMap: Record<string, ExpenseStatus> = {
        pending: ExpenseStatus.PENDING,
        approved: ExpenseStatus.APPROVED,
        rejected: ExpenseStatus.REJECTED,
      };
      const status = statusMap[this.filterStatus];
      if (status) {
        expenses = expenses.filter((e) => e.status === status);
      }
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      expenses = expenses.filter((e) =>
        e.description.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term)
      );
    }

    // Sort by date descending
    return expenses.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  /** Stats computed values */
  protected readonly totalRequests = computed(() => this.myExpenses().length);

  protected readonly pendingCount = computed(() =>
    this.myExpenses().filter((e) => e.status === ExpenseStatus.PENDING).length
  );

  protected readonly approvedCount = computed(() =>
    this.myExpenses().filter((e) => e.status === ExpenseStatus.APPROVED).length
  );

  protected readonly rejectedCount = computed(() =>
    this.myExpenses().filter((e) => e.status === ExpenseStatus.REJECTED).length
  );

  protected readonly totalApprovedAmount = computed(() => {
    const now = new Date();
    return this.myExpenses()
      .filter((e) => {
        if (e.status !== ExpenseStatus.APPROVED) return false;
        const date = new Date(e.date);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + e.amount, 0);
  });

  /**
   * Clear all filters
   */
  protected clearFilters(): void {
    this.filterStatus = 'all';
    this.searchTerm = '';
  }

  /**
   * View expense details
   */
  protected viewDetails(expense: any): void {
    this.selectedExpense.set(expense);
    this.showDetailsModal.set(true);
  }

  /**
   * Close details modal
   */
  protected closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedExpense.set(null);
  }
}
