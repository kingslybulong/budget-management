import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, ExpenseService, BudgetService } from '../../../services';
import { Expense, ExpenseStatus } from '../../../models';
import { StatusBadgeComponent } from '../../../shared/components';
import { PesoPipe, CategoryNamePipe } from '../../../shared/pipes';

/**
 * Expense Approval Component - Admin can approve or reject expense requests
 *
 * TODO (PART 12): Add bulk approval functionality
 * TODO (PART 13): Add expense editing before approval
 */
@Component({
  selector: 'app-expense-approval',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, StatusBadgeComponent, PesoPipe, CategoryNamePipe],
  template: `
    <div class="container-fluid py-4">
      <!-- Page Header -->
      <div class="mb-4">
        <h1 class="h3 mb-1">Expense Management</h1>
        <p class="text-muted mb-0">Review and manage expense requests from family members.</p>
      </div>

      <!-- Stats Cards -->
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="card bg-warning bg-opacity-10 border-warning h-100">
            <div class="card-body text-center">
              <h3 class="text-warning mb-1">{{ pendingExpenses().length }}</h3>
              <small class="text-muted">Pending Requests</small>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card bg-success bg-opacity-10 border-success h-100">
            <div class="card-body text-center">
              <h3 class="text-success mb-1">{{ approvedExpenses().length }}</h3>
              <small class="text-muted">Approved This Month</small>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card bg-danger bg-opacity-10 border-danger h-100">
            <div class="card-body text-center">
              <h3 class="text-danger mb-1">{{ rejectedExpenses().length }}</h3>
              <small class="text-muted">Rejected This Month</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Tabs and Category Filter -->
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4">
        <ul class="nav nav-tabs mb-0 flex-nowrap overflow-auto" style="flex-shrink: 0;">
          <li class="nav-item">
            <button
              class="nav-link"
              [class.active]="activeFilter() === 'pending'"
              (click)="setFilter('pending')"
            >
              <i class="bi bi-hourglass-split me-1"></i>
              Pending
              @if (pendingExpenses().length > 0) {
                <span class="badge bg-warning text-dark ms-1">{{ pendingExpenses().length }}</span>
              }
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              [class.active]="activeFilter() === 'approved'"
              (click)="setFilter('approved')"
            >
              <i class="bi bi-check-circle me-1"></i> Approved
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              [class.active]="activeFilter() === 'rejected'"
              (click)="setFilter('rejected')"
            >
              <i class="bi bi-x-circle me-1"></i> Rejected
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              [class.active]="activeFilter() === 'all'"
              (click)="setFilter('all')"
            >
              <i class="bi bi-list me-1"></i> All
            </button>
          </li>
        </ul>
        <select class="form-select form-select-sm" [ngModel]="filterCategory()" (ngModelChange)="filterCategory.set($event)" style="width: auto; min-width: 180px;">
          <option value="all">All Categories</option>
          @for (cat of availableCategories(); track cat.type) {
            <option [value]="cat.type">{{ cat.name }}</option>
          }
        </select>
      </div>

      <!-- Success/Error Messages -->
      @if (successMessage()) {
        <div class="alert alert-success alert-dismissible fade show" role="alert">
          <i class="bi bi-check-circle me-2"></i>{{ successMessage() }}
          <button type="button" class="btn-close" (click)="successMessage.set('')"></button>
        </div>
      }

      @if (errorMessage()) {
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          <i class="bi bi-exclamation-circle me-2"></i>{{ errorMessage() }}
          <button type="button" class="btn-close" (click)="errorMessage.set('')"></button>
        </div>
      }

      <!-- Expenses Table -->
      <div class="card shadow-sm">
        <div class="card-body p-0">
          @if (filteredExpenses().length === 0) {
            <div class="text-center py-5 text-muted">
              <i class="bi bi-inbox fs-1 mb-2 d-block"></i>
              <p class="mb-0">No {{ activeFilter() }} expenses found.</p>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover mb-0 align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Requested By</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th class="text-end">Amount</th>
                    <th class="text-center">Status</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (expense of filteredExpenses(); track expense.id) {
                    <tr>
                      <td>
                        <small class="text-muted">{{ expense.date | date:'MMM d, y' }}</small>
                      </td>
                      <td>
                        <div class="d-flex align-items-center">
                          <i class="bi bi-person-circle me-2 text-muted"></i>
                          <span>{{ expense.userName }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="badge bg-secondary">{{ expense.category | categoryName }}</span>
                      </td>
                      <td>
                        <span class="text-truncate d-inline-block" style="max-width: 200px;" [title]="expense.description">
                          {{ expense.description }}
                        </span>
                      </td>
                      <td class="text-end fw-semibold">{{ expense.amount | peso }}</td>
                      <td class="text-center">
                        <app-status-badge [status]="expense.status" />
                      </td>
                      <td class="text-center">
                        @if (expense.status === 'pending') {
                          <div class="btn-group btn-group-sm">
                            <button
                              class="btn btn-success"
                              (click)="approveExpense(expense)"
                              title="Approve"
                            >
                              <i class="bi bi-check-lg"></i>
                            </button>
                            <button
                              class="btn btn-danger"
                              (click)="openRejectModal(expense)"
                              title="Reject"
                            >
                              <i class="bi bi-x-lg"></i>
                            </button>
                          </div>
                        } @else if (expense.status === 'approved') {
                          <div class="d-flex align-items-center justify-content-center gap-2">
                            <small class="text-muted">
                              <i class="bi bi-check-circle text-success me-1"></i>
                              {{ expense.approvedAt | date:'MMM d' }}
                            </small>
                            <button
                              class="btn btn-sm btn-outline-danger"
                              (click)="confirmDeleteExpense(expense)"
                              title="Delete Expense"
                            >
                              <i class="bi bi-trash"></i>
                            </button>
                          </div>
                        } @else if (expense.status === 'rejected') {
                          <div class="btn-group btn-group-sm">
                            <button
                              class="btn btn-outline-secondary"
                              (click)="viewRejectionReason(expense)"
                              title="View Reason"
                            >
                              <i class="bi bi-info-circle"></i>
                            </button>
                            <button
                              class="btn btn-outline-danger"
                              (click)="confirmDeleteExpense(expense)"
                              title="Delete Expense"
                            >
                              <i class="bi bi-trash"></i>
                            </button>
                          </div>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>

      <!-- Rejection Modal -->
      @if (showRejectModal()) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-x-circle text-danger me-2"></i>Reject Expense
                </h5>
                <button type="button" class="btn-close" (click)="closeRejectModal()"></button>
              </div>
              <div class="modal-body">
                @if (selectedExpense()) {
                  <div class="mb-3">
                    <p class="mb-1"><strong>{{ selectedExpense()!.userName }}</strong></p>
                    <p class="mb-1 text-muted">{{ selectedExpense()!.description }}</p>
                    <p class="mb-0 fs-5 fw-semibold">{{ selectedExpense()!.amount | peso }}</p>
                  </div>
                }
                <div class="mb-3">
                  <label for="rejectionReason" class="form-label">Reason for Rejection</label>
                  <textarea
                    class="form-control"
                    id="rejectionReason"
                    rows="3"
                    [(ngModel)]="rejectionReason"
                    placeholder="Provide a reason for rejecting this expense..."
                  ></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeRejectModal()">
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn btn-danger"
                  (click)="confirmReject()"
                  [disabled]="!rejectionReason.trim()"
                >
                  <i class="bi bi-x-circle me-1"></i>Reject Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Rejection Reason View Modal -->
      @if (showReasonModal()) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-info-circle text-info me-2"></i>Rejection Reason
                </h5>
                <button type="button" class="btn-close" (click)="showReasonModal.set(false)"></button>
              </div>
              <div class="modal-body">
                @if (selectedExpense()) {
                  <p class="mb-2"><strong>{{ selectedExpense()!.userName }}</strong> - {{ selectedExpense()!.description }}</p>
                  <div class="alert alert-secondary mb-0">
                    {{ selectedExpense()!.rejectionReason || 'No reason provided.' }}
                  </div>
                }
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="showReasonModal.set(false)">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal()) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-trash text-danger me-2"></i>Delete Expense
                </h5>
                <button type="button" class="btn-close" (click)="closeDeleteModal()"></button>
              </div>
              <div class="modal-body">
                @if (selectedExpense()) {
                  <p>Are you sure you want to delete this expense?</p>
                  <div class="card bg-light">
                    <div class="card-body">
                      <p class="mb-1"><strong>{{ selectedExpense()!.userName }}</strong></p>
                      <p class="mb-1 text-muted">{{ selectedExpense()!.description }}</p>
                      <p class="mb-0 fs-5 fw-semibold text-danger">{{ selectedExpense()!.amount | peso }}</p>
                    </div>
                  </div>
                  @if (selectedExpense()!.status === 'approved') {
                    <div class="alert alert-warning mt-3 mb-0">
                      <i class="bi bi-exclamation-triangle me-2"></i>
                      This expense was approved. Deleting it will add the amount back to the budget category.
                    </div>
                  }
                }
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeDeleteModal()">
                  Cancel
                </button>
                <button type="button" class="btn btn-danger" (click)="deleteExpense()">
                  <i class="bi bi-trash me-1"></i>Delete Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ExpenseApprovalComponent {
  private readonly authService = inject(AuthService);
  private readonly expenseService = inject(ExpenseService);
  private readonly budgetService = inject(BudgetService);

  /** Current filter selection */
  protected readonly activeFilter = signal<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  /** Category filter */
  protected readonly filterCategory = signal('all');

  /** Get available categories from the current budget */
  protected readonly availableCategories = computed(() => {
    const budget = this.budgetService.currentBudget();
    if (!budget) return [];
    return budget.categories
      .filter(cat => cat.monthlyLimit > 0)
      .map(cat => ({ type: cat.type, name: cat.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  /** Messages */
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  /** Modal state */
  protected readonly showRejectModal = signal(false);
  protected readonly showReasonModal = signal(false);
  protected readonly showDeleteModal = signal(false);
  protected readonly selectedExpense = signal<Expense | null>(null);
  protected rejectionReason = '';

  /** Expense lists */
  protected readonly pendingExpenses = this.expenseService.pendingExpenses;
  protected readonly approvedExpenses = this.expenseService.approvedExpenses;
  protected readonly rejectedExpenses = this.expenseService.rejectedExpenses;

  /** Filtered expenses based on active filter and category */
  protected readonly filteredExpenses = computed(() => {
    let expenses: Expense[];
    switch (this.activeFilter()) {
      case 'pending':
        expenses = this.pendingExpenses();
        break;
      case 'approved':
        expenses = this.approvedExpenses();
        break;
      case 'rejected':
        expenses = this.rejectedExpenses();
        break;
      case 'all':
        expenses = this.expenseService.expenses();
        break;
      default:
        expenses = [];
    }

    // Apply category filter
    const categoryFilter = this.filterCategory();
    if (categoryFilter !== 'all') {
      expenses = expenses.filter(e => e.category === categoryFilter);
    }

    return expenses;
  });

  /**
   * Set the active filter
   */
  protected setFilter(filter: 'pending' | 'approved' | 'rejected' | 'all'): void {
    this.activeFilter.set(filter);
  }

  /**
   * Approve an expense
   */
  protected async approveExpense(expense: Expense): Promise<void> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    const success = await this.expenseService.approveExpense(expense, currentUser.id);
    if (success) {
      this.successMessage.set(`Expense from ${expense.userName} has been approved.`);
      this.errorMessage.set('');
    } else {
      this.errorMessage.set('Failed to approve expense. Please try again.');
    }
  }

  /**
   * Open reject modal
   */
  protected openRejectModal(expense: Expense): void {
    this.selectedExpense.set(expense);
    this.rejectionReason = '';
    this.showRejectModal.set(true);
  }

  /**
   * Close reject modal
   */
  protected closeRejectModal(): void {
    this.showRejectModal.set(false);
    this.selectedExpense.set(null);
    this.rejectionReason = '';
  }

  /**
   * Confirm rejection with reason
   */
  protected async confirmReject(): Promise<void> {
    const expense = this.selectedExpense();
    if (!expense || !this.rejectionReason.trim()) return;

    const success = await this.expenseService.rejectExpense(expense.id, this.rejectionReason.trim());
    if (success) {
      this.successMessage.set(`Expense from ${expense.userName} has been rejected.`);
      this.errorMessage.set('');
    } else {
      this.errorMessage.set('Failed to reject expense. Please try again.');
    }

    this.closeRejectModal();
  }

  /**
   * View rejection reason for a rejected expense
   */
  protected viewRejectionReason(expense: Expense): void {
    this.selectedExpense.set(expense);
    this.showReasonModal.set(true);
  }

  /**
   * Open delete confirmation modal
   */
  protected confirmDeleteExpense(expense: Expense): void {
    this.selectedExpense.set(expense);
    this.showDeleteModal.set(true);
  }

  /**
   * Close delete modal
   */
  protected closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.selectedExpense.set(null);
  }

  /**
   * Delete the selected expense
   */
  protected async deleteExpense(): Promise<void> {
    const expense = this.selectedExpense();
    if (!expense) return;

    const success = await this.expenseService.deleteExpense(expense.id);
    if (success) {
      this.successMessage.set(`Expense from ${expense.userName} has been deleted.`);
      this.errorMessage.set('');
    } else {
      this.errorMessage.set('Failed to delete expense. Please try again.');
    }

    this.closeDeleteModal();
  }
}
