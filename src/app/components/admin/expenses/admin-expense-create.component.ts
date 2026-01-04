import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ExpenseService, AuthService, BudgetService } from '../../../services';
import { BudgetCategoryType, ExpenseStatus, Role, User } from '../../../models';
import { PesoPipe } from '../../../shared/pipes';

/**
 * Admin Expense Creation Component - Admin can directly add expenses
 */
@Component({
  selector: 'app-admin-expense-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ FormsModule, PesoPipe],
  template: `
    <div class="container-fluid py-4">
      <!-- Page Header -->
      <div class="mb-4">
        <h1 class="h3 mb-1">Add Expense</h1>
        <p class="text-muted mb-0">Record a new expense directly (auto-approved).</p>
      </div>

      <!-- Messages -->
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

      <div class="row g-4">
        <!-- Create Expense Form -->
        <div class="col-lg-6">
          <div class="card shadow-sm">
            <div class="card-header bg-success text-white">
              <h5 class="mb-0">
                <i class="bi bi-plus-circle me-2"></i>New Expense
              </h5>
            </div>
            <div class="card-body">
              <form (ngSubmit)="submitExpense()">
                <div class="mb-3">
                  <label for="description" class="form-label">Description</label>
                  <input
                    type="text"
                    class="form-control"
                    id="description"
                    [(ngModel)]="expense.description"
                    name="description"
                    placeholder="e.g., Weekly groceries"
                    required
                  />
                </div>

                <div class="row mb-3">
                  <div class="col-6">
                    <label for="amount" class="form-label">Amount</label>
                    <div class="input-group">
                      <span class="input-group-text">₱</span>
                      <input
                        type="number"
                        class="form-control"
                        id="amount"
                        [(ngModel)]="expense.amount"
                        name="amount"
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  <div class="col-6">
                    <label for="date" class="form-label">Date</label>
                    <input
                      type="date"
                      class="form-control"
                      id="date"
                      [(ngModel)]="expense.date"
                      name="date"
                      required
                    />
                  </div>
                </div>

                <div class="mb-3">
                  <label for="category" class="form-label">Category</label>
                  <select
                    class="form-select"
                    id="category"
                    [(ngModel)]="expense.categoryId"
                    name="category"
                    required
                  >
                    <option value="">Select a category...</option>
                    @for (cat of categories(); track cat.id) {
                      <option [value]="cat.id">{{ cat.label }}</option>
                    }
                  </select>
                </div>

                <div class="mb-3">
                  <label for="paidBy" class="form-label">Paid By</label>
                  <select
                    class="form-select"
                    id="paidBy"
                    [(ngModel)]="expense.userId"
                    name="paidBy"
                    required
                  >
                    @for (user of users(); track user.id) {
                      <option [value]="user.id">{{ user.name }}</option>
                    }
                  </select>
                </div>

                <div class="mb-4">
                  <label for="notes" class="form-label">Notes (Optional)</label>
                  <textarea
                    class="form-control"
                    id="notes"
                    [(ngModel)]="expense.notes"
                    name="notes"
                    rows="2"
                    placeholder="Additional details..."
                  ></textarea>
                </div>

                <div class="d-flex gap-2">
                  <button
                    type="submit"
                    class="btn btn-success flex-grow-1"
                    [disabled]="isSubmitting() || !isFormValid()"
                  >
                    @if (isSubmitting()) {
                      <span class="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    } @else {
                      <i class="bi bi-check-circle me-2"></i>Save Expense
                    }
                  </button>
                  <button type="button" class="btn btn-outline-secondary" (click)="resetForm()">
                    <i class="bi bi-x-circle"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Quick Info -->
        <div class="col-lg-6">
          <div class="card bg-light border-0">
            <div class="card-body">
              <h6 class="card-title">
                <i class="bi bi-info-circle me-2 text-primary"></i>About Direct Expenses
              </h6>
              <ul class="mb-0 small text-muted">
                <li>Expenses added here are <strong>automatically approved</strong>.</li>
                <li>They are immediately added to the budget category spending.</li>
                <li>Use this for expenses you've already paid or verified.</li>
                <li>For expense requests that need approval, use the regular request flow.</li>
              </ul>
            </div>
          </div>

          <!-- Recent Expenses -->
          <div class="card shadow-sm mt-4">
            <div class="card-header bg-white">
              <h6 class="mb-0">
                <i class="bi bi-clock-history me-2"></i>Recent Expenses
              </h6>
            </div>
            <div class="card-body p-0">
              @if (recentExpenses().length === 0) {
                <div class="text-center py-4 text-muted">
                  <i class="bi bi-receipt fs-3 d-block mb-2"></i>
                  <small>No expenses yet</small>
                </div>
              } @else {
                <ul class="list-group list-group-flush">
                  @for (exp of recentExpenses(); track exp.id) {
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <div class="fw-medium">{{ exp.description }}</div>
                        <small class="text-muted">{{ exp.category }}</small>
                      </div>
                      <span class="text-danger fw-semibold">{{ exp.amount | peso }}</span>
                    </li>
                  }
                </ul>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminExpenseCreateComponent {
  private readonly expenseService = inject(ExpenseService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly users = signal<User[]>([]);
  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly recentExpenses = computed(() => {
    return [...this.expenseService.expenses()]
      .filter(e => e.status === ExpenseStatus.APPROVED)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  });

  // Dynamic categories from current budget
  private readonly budgetService = inject(BudgetService);
  protected readonly categories = computed(() => {
    const budget = this.budgetService.currentBudget();
    if (!budget) return [];
    return budget.categories.map(cat => ({
      value: cat.type,
      label: cat.name,
      id: cat.id
    }));
  });

  protected expense = {
    description: '',
    amount: 0,
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    userId: '',
    notes: '',
  };

  constructor() {
    this.loadUsers();
  }

  /** Get category info from ID */
  private getCategoryById(categoryId: string) {
    return this.categories().find(c => c.id === categoryId);
  }

  private async loadUsers(): Promise<void> {
    try {
      const allUsers = await this.authService.getAllUsers();
      this.users.set(allUsers);
      // Default to current user
      const currentUser = this.authService.currentUser();
      if (currentUser) {
        this.expense.userId = currentUser.id;
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  protected isFormValid(): boolean {
    return (
      this.expense.description.trim().length > 0 &&
      this.expense.amount > 0 &&
      this.expense.categoryId.length > 0 &&
      this.expense.userId.length > 0
    );
  }

  protected async submitExpense(): Promise<void> {
    if (!this.isFormValid()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      // Get user name and current admin
      const user = this.users().find(u => u.id === this.expense.userId);
      const currentAdmin = this.authService.currentUser();
      const category = this.getCategoryById(this.expense.categoryId);

      if (!category) {
        this.errorMessage.set('Please select a valid category.');
        return;
      }

      // Build description with notes if provided
      const description = this.expense.notes.trim()
        ? `${this.expense.description.trim()} - ${this.expense.notes.trim()}`
        : this.expense.description.trim();

      // Submit expense with auto-approve
      const result = await this.expenseService.submitExpense(
        this.expense.userId,
        user?.name || 'Unknown',
        this.expense.amount,
        category.value,
        description,
        new Date(this.expense.date),
        this.expense.categoryId
      );

      if (result) {
        // Auto-approve the expense since admin is adding it directly
        // Pass the expense object directly since it may not be in the signal yet
        await this.expenseService.approveExpense(result, currentAdmin?.id || 'admin');

        this.successMessage.set('Expense added and approved successfully!');
        this.resetForm();
      } else {
        this.errorMessage.set('Failed to add expense.');
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || 'An error occurred.');
    } finally {
      this.isSubmitting.set(false);
      setTimeout(() => this.successMessage.set(''), 3000);
    }
  }

  protected resetForm(): void {
    const currentUser = this.authService.currentUser();
    this.expense = {
      description: '',
      amount: 0,
      categoryId: '',
      date: new Date().toISOString().split('T')[0],
      userId: currentUser?.id || '',
      notes: '',
    };
  }
}
