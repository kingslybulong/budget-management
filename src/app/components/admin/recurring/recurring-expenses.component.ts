import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, ExpenseService, BudgetService, AllowanceService } from '../../../services';
import { RecurringExpense, BudgetCategoryType, User, Role } from '../../../models';
import { PesoPipe, CategoryNamePipe } from '../../../shared/pipes';

/**
 * Recurring Expenses Component - Admin manages auto-recurring monthly expenses
 *
 * TODO (PART 18): Add recurring expense execution history
 * TODO (PART 19): Add schedule preview calendar
 */
@Component({
  selector: 'app-recurring-expenses',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ FormsModule, PesoPipe, CategoryNamePipe],
  styles: [`
    /* Mobile-first responsive styles */
    .page-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      color: white;
    }

    .page-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .page-header p {
      opacity: 0.9;
      font-size: 0.875rem;
      margin-bottom: 0;
    }

    .header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .header-actions .btn {
      flex: 1 1 auto;
      min-width: 120px;
    }

    @media (min-width: 768px) {
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2rem;
      }

      .page-header h1 {
        font-size: 1.75rem;
      }

      .header-actions {
        margin-top: 0;
        flex-wrap: nowrap;
      }

      .header-actions .btn {
        flex: 0 0 auto;
        min-width: auto;
      }
    }

    /* Summary cards */
    .summary-card {
      border-radius: 1rem;
      padding: 1.25rem;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .summary-card .icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 0.75rem;
      font-size: 1.25rem;
    }

    .summary-card .value {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .summary-card .label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Expense cards for mobile */
    .expense-card {
      border-radius: 1rem;
      margin-bottom: 1rem;
      overflow: hidden;
      transition: box-shadow 0.2s;
    }

    .expense-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .expense-card.inactive {
      opacity: 0.7;
    }

    .expense-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }

    .expense-card-header .expense-info {
      flex: 1;
      min-width: 0;
    }

    .expense-card-header .expense-title {
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .expense-card-header .expense-meta {
      font-size: 0.75rem;
      color: #6c757d;
    }

    .expense-card-header .expense-amount {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0d6efd;
      white-space: nowrap;
    }

    .expense-card-body {
      padding: 1rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .expense-card-actions {
      display: flex;
      border-top: 1px solid #e9ecef;
    }

    .expense-card-actions .btn {
      flex: 1;
      border-radius: 0;
      padding: 0.75rem;
      border: none;
      background: transparent;
    }

    .expense-card-actions .btn:not(:last-child) {
      border-right: 1px solid #e9ecef;
    }

    .expense-card-actions .btn:hover {
      background: #f8f9fa;
    }

    /* Desktop table styles */
    .desktop-table {
      display: none;
    }

    .mobile-cards {
      display: block;
    }

    @media (min-width: 992px) {
      .desktop-table {
        display: block;
      }

      .mobile-cards {
        display: none;
      }
    }

    /* Empty state */
    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
    }

    .empty-state .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      font-size: 2rem;
      color: white;
    }

    .empty-state h5 {
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #6c757d;
      margin-bottom: 1.5rem;
    }

    /* Info card */
    .info-card {
      background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
      border-radius: 1rem;
      border-left: 4px solid #0ea5e9;
    }

    .info-card h6 {
      color: #0369a1;
    }

    .info-card ul {
      color: #0c4a6e;
    }

    /* Modal improvements */
    .modal-content {
      border-radius: 1rem;
      border: none;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .modal-header {
      border-bottom: 1px solid #e9ecef;
      padding: 1.25rem 1.5rem;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .modal-footer {
      border-top: 1px solid #e9ecef;
      padding: 1rem 1.5rem;
    }

    @media (max-width: 576px) {
      .modal-dialog {
        margin: 0.5rem;
      }

      .modal-content {
        border-radius: 1rem;
      }
    }

    /* Recipient badge */
    .recipient-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      background: rgba(13, 110, 253, 0.1);
      color: #0d6efd;
      border-radius: 0.5rem;
      font-size: 0.75rem;
    }

    .warning-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      background: rgba(255, 193, 7, 0.1);
      color: #cc9a00;
      border-radius: 0.5rem;
      font-size: 0.75rem;
    }

    /* Status indicator */
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }

    .status-indicator.active {
      background: #198754;
      box-shadow: 0 0 0 3px rgba(25, 135, 84, 0.2);
    }

    .status-indicator.paused {
      background: #6c757d;
    }
  `],
  template: `
    <div class="container-fluid py-3 py-md-4">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1><i class="bi bi-arrow-repeat me-2"></i>Recurring Expenses</h1>
          <p>Manage automatic monthly expenses that repeat each month</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-light btn-sm" (click)="processNow()" [disabled]="processing()">
            @if (processing()) {
              <span class="spinner-border spinner-border-sm me-1"></span>
            } @else {
              <i class="bi bi-play-circle me-1"></i>
            }
            <span class="d-none d-sm-inline">Process Now</span>
          </button>
          <button class="btn btn-warning btn-sm" (click)="openAddModal()">
            <i class="bi bi-plus-circle me-1"></i>
            <span>Add New</span>
          </button>
        </div>
      </div>

      <!-- Success/Error Messages -->
      @if (successMessage()) {
        <div class="alert alert-success alert-dismissible fade show d-flex align-items-center" role="alert">
          <i class="bi bi-check-circle-fill me-2"></i>
          <div class="flex-grow-1">{{ successMessage() }}</div>
          <button type="button" class="btn-close" (click)="successMessage.set('')"></button>
        </div>
      }

      <!-- Summary Cards -->
      <div class="row g-3 mb-4">
        <div class="col-4">
          <div class="summary-card bg-white shadow-sm">
            <div class="icon bg-primary bg-opacity-10 text-primary">
              <i class="bi bi-check-circle"></i>
            </div>
            <div class="value text-primary">{{ activeCount() }}</div>
            <div class="label">Active</div>
          </div>
        </div>
        <div class="col-4">
          <div class="summary-card bg-white shadow-sm">
            <div class="icon bg-warning bg-opacity-10 text-warning">
              <i class="bi bi-currency-exchange"></i>
            </div>
            <div class="value text-warning" style="font-size: 1.1rem;">{{ totalMonthlyAmount() | peso }}</div>
            <div class="label">Monthly</div>
          </div>
        </div>
        <div class="col-4">
          <div class="summary-card bg-white shadow-sm">
            <div class="icon bg-secondary bg-opacity-10 text-secondary">
              <i class="bi bi-pause-circle"></i>
            </div>
            <div class="value text-secondary">{{ inactiveCount() }}</div>
            <div class="label">Paused</div>
          </div>
        </div>
      </div>

      <!-- Recurring Expenses List -->
      <div class="card shadow-sm border-0" style="border-radius: 1rem; overflow: hidden;">
        <div class="card-header bg-white py-3">
          <h5 class="mb-0 d-flex align-items-center">
            <i class="bi bi-list-ul me-2 text-primary"></i>
            All Recurring Expenses
            <span class="badge bg-primary ms-2">{{ recurringExpenses().length }}</span>
          </h5>
        </div>

        @if (recurringExpenses().length === 0) {
          <div class="empty-state">
            <div class="icon">
              <i class="bi bi-arrow-repeat"></i>
            </div>
            <h5>No Recurring Expenses Yet</h5>
            <p>Set up recurring expenses to automate your monthly bills and allowances.</p>
            <button class="btn btn-primary" (click)="openAddModal()">
              <i class="bi bi-plus-circle me-2"></i>Create First Recurring
            </button>
          </div>
        } @else {
          <!-- Mobile Cards View -->
          <div class="mobile-cards p-3">
            @for (expense of recurringExpenses(); track expense.id) {
              <div class="expense-card bg-white shadow-sm" [class.inactive]="!expense.isActive">
                <div class="expense-card-header">
                  <div class="expense-info">
                    <div class="expense-title">
                      <span class="status-indicator" [class.active]="expense.isActive" [class.paused]="!expense.isActive"></span>
                      {{ expense.description }}
                    </div>
                    <div class="expense-meta">
                      Added by {{ expense.userName }}
                    </div>
                  </div>
                  <div class="expense-amount">{{ expense.amount | peso }}</div>
                </div>
                <div class="expense-card-body">
                  <span class="badge bg-secondary">{{ expense.category | categoryName }}</span>
                  <span class="badge bg-info">
                    <i class="bi bi-calendar-event me-1"></i>Day {{ expense.dayOfMonth }}
                  </span>
                  @if (expense.isActive) {
                    <span class="badge bg-success">Active</span>
                  } @else {
                    <span class="badge bg-secondary">Paused</span>
                  }
                  @if (expense.targetUserName) {
                    <span class="recipient-badge">
                      <i class="bi bi-person-check"></i>{{ expense.targetUserName }}
                    </span>
                  } @else if (expense.category === 'allowances') {
                    <span class="warning-badge">
                      <i class="bi bi-exclamation-triangle"></i>No recipient
                    </span>
                  }
                </div>
                <div class="expense-card-actions">
                  <button class="btn text-primary" (click)="openEditModal(expense)" title="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    class="btn"
                    [class.text-warning]="expense.isActive"
                    [class.text-success]="!expense.isActive"
                    (click)="toggleStatus(expense)"
                    [title]="expense.isActive ? 'Pause' : 'Activate'"
                  >
                    <i [class]="expense.isActive ? 'bi bi-pause-fill' : 'bi bi-play-fill'"></i>
                  </button>
                  <button class="btn text-info" (click)="resetAndReprocess(expense)" title="Reprocess">
                    <i class="bi bi-arrow-clockwise"></i>
                  </button>
                  <button class="btn text-danger" (click)="confirmDelete(expense)" title="Delete">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Desktop Table View -->
          <div class="desktop-table">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Day</th>
                    <th class="text-end">Amount</th>
                    <th class="text-center">Status</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (expense of recurringExpenses(); track expense.id) {
                    <tr [class.table-secondary]="!expense.isActive">
                      <td>
                        <div class="d-flex align-items-center">
                          <span class="status-indicator me-2" [class.active]="expense.isActive" [class.paused]="!expense.isActive"></span>
                          <div>
                            <div class="fw-medium">{{ expense.description }}</div>
                            <small class="text-muted">by {{ expense.userName }}</small>
                            @if (expense.targetUserName) {
                              <div class="recipient-badge mt-1">
                                <i class="bi bi-person-check"></i>{{ expense.targetUserName }}
                              </div>
                            } @else if (expense.category === 'allowances') {
                              <div class="warning-badge mt-1">
                                <i class="bi bi-exclamation-triangle"></i>No recipient
                              </div>
                            }
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="badge bg-secondary">{{ expense.category | categoryName }}</span>
                      </td>
                      <td>
                        <span class="badge bg-info">
                          <i class="bi bi-calendar-event me-1"></i>{{ expense.dayOfMonth }}
                        </span>
                      </td>
                      <td class="text-end">
                        <span class="fw-bold text-primary">{{ expense.amount | peso }}</span>
                      </td>
                      <td class="text-center">
                        @if (expense.isActive) {
                          <span class="badge bg-success">
                            <i class="bi bi-check-circle me-1"></i>Active
                          </span>
                        } @else {
                          <span class="badge bg-secondary">
                            <i class="bi bi-pause-circle me-1"></i>Paused
                          </span>
                        }
                      </td>
                      <td class="text-center">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-primary" (click)="openEditModal(expense)" title="Edit">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button
                            class="btn"
                            [class.btn-outline-warning]="expense.isActive"
                            [class.btn-outline-success]="!expense.isActive"
                            (click)="toggleStatus(expense)"
                            [title]="expense.isActive ? 'Pause' : 'Activate'"
                          >
                            <i [class]="expense.isActive ? 'bi bi-pause' : 'bi bi-play'"></i>
                          </button>
                          <button class="btn btn-outline-info" (click)="resetAndReprocess(expense)" title="Reprocess">
                            <i class="bi bi-arrow-clockwise"></i>
                          </button>
                          <button class="btn btn-outline-danger" (click)="confirmDelete(expense)" title="Delete">
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>

      <!-- Info Card -->
      <div class="card info-card border-0 mt-4">
        <div class="card-body">
          <h6 class="d-flex align-items-center mb-3">
            <i class="bi bi-lightbulb me-2"></i>How Recurring Expenses Work
          </h6>
          <ul class="mb-0 small ps-3">
            <li class="mb-2">Active recurring expenses are automatically created on the specified day each month.</li>
            <li class="mb-2">They are auto-approved and deducted from the corresponding budget category.</li>
            <li class="mb-2">Pause a recurring expense to temporarily stop it without deleting.</li>
            <li>Day of month is capped at 28 to avoid issues with shorter months.</li>
          </ul>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title d-flex align-items-center">
                  <i class="bi bi-arrow-repeat text-primary me-2"></i>
                  {{ editingExpense() ? 'Edit' : 'Add' }} Recurring Expense
                </h5>
                <button type="button" class="btn-close" (click)="closeModal()"></button>
              </div>
              <div class="modal-body">
                <!-- Description -->
                <div class="mb-3">
                  <label class="form-label fw-medium">
                    <i class="bi bi-card-text text-muted me-1"></i>Description
                  </label>
                  <input
                    type="text"
                    class="form-control form-control-lg"
                    [(ngModel)]="formDescription"
                    placeholder="e.g., Internet subscription"
                  />
                </div>

                <!-- Category -->
                <div class="mb-3">
                  <label class="form-label fw-medium">
                    <i class="bi bi-tag text-muted me-1"></i>Category
                  </label>
                  <select class="form-select form-select-lg" [(ngModel)]="formCategoryId" (ngModelChange)="onCategoryChange()">
                    <option value="">Select a category...</option>
                    @for (cat of categories(); track cat.id) {
                      <option [value]="cat.id">{{ cat.label }}</option>
                    }
                  </select>
                </div>

                <!-- Target User (only for Allowances category) -->
                @if (isAllowanceCategory()) {
                  <div class="mb-3">
                    <label class="form-label fw-medium">
                      <i class="bi bi-person-check text-primary me-1"></i>Recipient User
                    </label>
                    <select class="form-select form-select-lg" [(ngModel)]="formTargetUserId" (ngModelChange)="onTargetUserChange()">
                      <option value="">Select who receives this allowance...</option>
                      @for (user of availableUsers(); track user.id) {
                        <option [value]="user.id">{{ user.name }}</option>
                      }
                    </select>
                    <div class="form-text">
                      <i class="bi bi-info-circle me-1"></i>
                      The selected user will receive this allowance automatically each month.
                    </div>
                  </div>
                }

                <div class="row g-3">
                  <!-- Amount -->
                  <div class="col-7">
                    <label class="form-label fw-medium">
                      <i class="bi bi-currency-exchange text-muted me-1"></i>Amount
                    </label>
                    <div class="input-group input-group-lg">
                      <span class="input-group-text">₱</span>
                      <input
                        type="number"
                        class="form-control"
                        [(ngModel)]="formAmount"
                        min="1"
                        step="100"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <!-- Day of Month -->
                  <div class="col-5">
                    <label class="form-label fw-medium">
                      <i class="bi bi-calendar-event text-muted me-1"></i>Day
                    </label>
                    <input
                      type="number"
                      class="form-control form-control-lg"
                      [(ngModel)]="formDayOfMonth"
                      min="1"
                      max="28"
                      placeholder="1-28"
                    />
                  </div>
                </div>
                <div class="form-text mt-2">
                  <i class="bi bi-info-circle me-1"></i>
                  The expense will be created on day {{ formDayOfMonth || '?' }} every month.
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" (click)="closeModal()">
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn btn-primary px-4"
                  (click)="saveExpense()"
                  [disabled]="!canSave()"
                >
                  <i class="bi bi-check-lg me-1"></i>
                  {{ editingExpense() ? 'Update' : 'Create' }}
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
              <div class="modal-header border-danger border-3 border-top-0 border-start-0 border-end-0">
                <h5 class="modal-title text-danger d-flex align-items-center">
                  <i class="bi bi-exclamation-triangle-fill me-2"></i>Delete Recurring Expense
                </h5>
                <button type="button" class="btn-close" (click)="showDeleteModal.set(false)"></button>
              </div>
              <div class="modal-body">
                @if (deletingExpense()) {
                  <p class="mb-3">Are you sure you want to delete this recurring expense? This action cannot be undone.</p>
                  <div class="bg-light rounded-3 p-3">
                    <div class="fw-bold mb-1">{{ deletingExpense()!.description }}</div>
                    <div class="d-flex gap-2 flex-wrap">
                      <span class="badge bg-primary">{{ deletingExpense()!.amount | peso }}</span>
                      <span class="badge bg-info">Day {{ deletingExpense()!.dayOfMonth }}</span>
                    </div>
                  </div>
                }
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" (click)="showDeleteModal.set(false)">
                  Cancel
                </button>
                <button type="button" class="btn btn-danger px-4" (click)="deleteExpense()">
                  <i class="bi bi-trash me-1"></i>Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class RecurringExpensesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly expenseService = inject(ExpenseService);
  private readonly budgetService = inject(BudgetService);
  private readonly allowanceService = inject(AllowanceService);

  /** Available users for allowance recipient */
  protected readonly availableUsers = signal<User[]>([]);

  /** Category options - dynamically loaded from current budget */
  protected readonly categories = computed(() => {
    const budget = this.budgetService.currentBudget();
    if (!budget) return [];
    return budget.categories.map(cat => ({
      value: cat.type,
      label: cat.name,
      id: cat.id
    }));
  });

  /** State signals */
  protected readonly successMessage = signal('');
  protected readonly showModal = signal(false);
  protected readonly showDeleteModal = signal(false);
  protected readonly editingExpense = signal<RecurringExpense | null>(null);
  protected readonly deletingExpense = signal<RecurringExpense | null>(null);
  protected readonly processing = signal(false);

  /** Form fields */
  protected formDescription = '';
  protected formCategoryId = '';
  protected formAmount = 0;
  protected formDayOfMonth = 1;
  protected formTargetUserId = '';
  protected formTargetUserName = '';

  /** Check if selected category is Allowances */
  protected isAllowanceCategory(): boolean {
    const category = this.getCategoryById(this.formCategoryId);
    return category?.value === BudgetCategoryType.ALLOWANCES;
  }

  /** Handle category change */
  protected onCategoryChange(): void {
    // Clear target user if not allowances
    if (!this.isAllowanceCategory()) {
      this.formTargetUserId = '';
      this.formTargetUserName = '';
    }
  }

  /** Handle target user change */
  protected onTargetUserChange(): void {
    const user = this.availableUsers().find(u => u.id === this.formTargetUserId);
    this.formTargetUserName = user?.name || '';
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  /** Load available users */
  private async loadUsers(): Promise<void> {
    const users = await this.authService.getAllUsers();
    // Filter to only show users with USER role
    this.availableUsers.set(users.filter(u => u.role === Role.USER));
  }

  /** Get category info from ID */
  private getCategoryById(categoryId: string) {
    return this.categories().find(c => c.id === categoryId);
  }

  /** Recurring expenses list */
  protected readonly recurringExpenses = this.expenseService.recurringExpenses;

  /** Computed stats */
  protected activeCount(): number {
    return this.recurringExpenses().filter((e) => e.isActive).length;
  }

  protected inactiveCount(): number {
    return this.recurringExpenses().filter((e) => !e.isActive).length;
  }

  protected totalMonthlyAmount(): number {
    return this.recurringExpenses()
      .filter((e) => e.isActive)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  /**
   * Open add modal
   */
  protected openAddModal(): void {
    this.editingExpense.set(null);
    this.formDescription = '';
    this.formCategoryId = '';
    this.formAmount = 0;
    this.formDayOfMonth = 1;
    this.formTargetUserId = '';
    this.formTargetUserName = '';
    this.showModal.set(true);
  }

  /**
   * Open edit modal
   */
  protected openEditModal(expense: RecurringExpense): void {
    this.editingExpense.set(expense);
    this.formDescription = expense.description;
    this.formCategoryId = expense.categoryId || '';
    this.formAmount = expense.amount;
    this.formDayOfMonth = expense.dayOfMonth;
    this.formTargetUserId = expense.targetUserId || '';
    this.formTargetUserName = expense.targetUserName || '';
    this.showModal.set(true);
  }

  /**
   * Close modal
   */
  protected closeModal(): void {
    this.showModal.set(false);
    this.editingExpense.set(null);
  }

  /**
   * Check if form can be saved
   */
  protected canSave(): boolean {
    const basicValid =
      this.formDescription.trim() !== '' &&
      this.formCategoryId !== '' &&
      this.formAmount > 0 &&
      this.formDayOfMonth >= 1 &&
      this.formDayOfMonth <= 28;

    // If allowance category, require target user
    if (this.isAllowanceCategory()) {
      return basicValid && this.formTargetUserId !== '';
    }

    return basicValid;
  }

  /**
   * Save expense
   */
  protected async saveExpense(): Promise<void> {
    if (!this.canSave()) return;

    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    const category = this.getCategoryById(this.formCategoryId);
    if (!category) return;

    // Get target user info for allowances
    const targetUserId = this.isAllowanceCategory() ? this.formTargetUserId : undefined;
    const targetUserName = this.isAllowanceCategory() ? this.formTargetUserName : undefined;

    if (this.editingExpense()) {
      const editing = this.editingExpense()!;
      await this.expenseService.updateRecurringExpense(
        editing.id,
        this.formAmount,
        category.value,
        this.formDescription.trim(),
        this.formDayOfMonth,
        this.formCategoryId,
        targetUserId,
        targetUserName
      );
      this.successMessage.set('Recurring expense updated successfully!');
    } else {
      await this.expenseService.createRecurringExpense(
        currentUser.id,
        currentUser.name,
        this.formAmount,
        category.value,
        this.formDescription.trim(),
        this.formDayOfMonth,
        this.formCategoryId,
        targetUserId,
        targetUserName
      );
      this.successMessage.set('Recurring expense created successfully!');
    }

    this.closeModal();
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  /**
   * Toggle expense active status
   */
  protected async toggleStatus(expense: RecurringExpense): Promise<void> {
    await this.expenseService.toggleRecurringExpense(expense.id);
    const status = expense.isActive ? 'paused' : 'activated';
    this.successMessage.set(`Recurring expense ${status}.`);
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  /**
   * Confirm delete
   */
  protected confirmDelete(expense: RecurringExpense): void {
    this.deletingExpense.set(expense);
    this.showDeleteModal.set(true);
  }

  /**
   * Delete expense
   */
  protected async deleteExpense(): Promise<void> {
    const expense = this.deletingExpense();
    if (!expense) return;

    await this.expenseService.deleteRecurringExpense(expense.id);
    this.successMessage.set('Recurring expense deleted.');
    this.showDeleteModal.set(false);
    this.deletingExpense.set(null);
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  /**
   * Manually process all due recurring expenses now
   */
  protected async processNow(): Promise<void> {
    this.processing.set(true);
    try {
      await this.expenseService.processRecurringExpenses();
      this.successMessage.set('Recurring expenses processed successfully!');
    } catch (error) {
      console.error('Error processing recurring expenses:', error);
      this.successMessage.set('Error processing recurring expenses. Check console for details.');
    } finally {
      this.processing.set(false);
      setTimeout(() => this.successMessage.set(''), 3000);
    }
  }

  /**
   * Reset and reprocess a specific recurring expense
   */
  protected async resetAndReprocess(expense: RecurringExpense): Promise<void> {
    this.processing.set(true);
    try {
      // Reset the lastProcessedMonth
      await this.expenseService.resetRecurringExpense(expense.id);

      // Wait a moment for Firestore to sync
      await new Promise(resolve => setTimeout(resolve, 500));

      // Process all recurring expenses
      await this.expenseService.processRecurringExpenses();

      this.successMessage.set(`"${expense.description}" reset and processed successfully!`);
    } catch (error) {
      console.error('Error resetting recurring expense:', error);
      this.successMessage.set('Error resetting expense. Check console for details.');
    } finally {
      this.processing.set(false);
      setTimeout(() => this.successMessage.set(''), 3000);
    }
  }
}
