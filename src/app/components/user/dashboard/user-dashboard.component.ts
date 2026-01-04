import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService, ExpenseService, AllowanceService } from '../../../services';
import { StatsCardComponent, StatusBadgeComponent } from '../../../shared/components';
import { PesoPipe, CategoryNamePipe } from '../../../shared/pipes';

/**
 * User Dashboard - View for family members (sisters)
 * Can submit expense requests and view allowance
 *
 * TODO (PART 9): Add expense request form modal
 * TODO (PART 10): Add allowance spending form
 */
@Component({
  selector: 'app-user-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, DecimalPipe, StatsCardComponent, StatusBadgeComponent, PesoPipe, CategoryNamePipe],
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
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .quick-action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 0.25rem;
      background: white;
      border-radius: 0.75rem;
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
      font-size: 1.25rem;
      margin-bottom: 0.25rem;
    }

    .quick-action-card span {
      font-size: 0.65rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .quick-action-card.primary { border-color: #0d6efd; color: #0d6efd; }
    .quick-action-card.secondary { border-color: #6c757d; color: #6c757d; }
    .quick-action-card.success { border-color: #198754; color: #198754; }

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

      .quick-action-card i {
        font-size: 1.5rem;
      }

      .quick-action-card span {
        font-size: 0.75rem;
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
    }
  `],
  template: `
    <div class="container-fluid py-3 py-md-4">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1>Welcome, {{ userName() }}!</h1>
          <p class="text-muted">Manage your expenses and allowance.</p>
        </div>
        <!-- Desktop Navigation -->
        <div class="desktop-nav">
          <a routerLink="/user/allowance" class="btn btn-outline-primary btn-sm">
            <i class="bi bi-wallet2 me-1"></i> Allowance
          </a>
          <a routerLink="/user/history" class="btn btn-outline-secondary btn-sm">
            <i class="bi bi-clock-history me-1"></i> History
          </a>
          <a routerLink="/user/request" class="btn btn-primary btn-sm">
            <i class="bi bi-plus-circle me-1"></i> New Expense Request
          </a>
        </div>
      </div>

      <!-- Mobile Quick Actions -->
      <div class="mobile-nav">
        <div class="quick-actions">
          <a routerLink="/user/allowance" class="quick-action-card primary">
            <i class="bi bi-wallet2"></i>
            <span>Allowance</span>
          </a>
          <a routerLink="/user/history" class="quick-action-card secondary">
            <i class="bi bi-clock-history"></i>
            <span>History</span>
          </a>
          <a routerLink="/user/request" class="quick-action-card success">
            <i class="bi bi-plus-circle"></i>
            <span>New Expense Request</span>
          </a>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="row g-3 mb-4">
        <div class="col-md-6 col-lg-3">
          <app-stats-card
            label="Monthly Allowance"
            [value]="monthlyAllowance() | peso"
            icon="bi-cash-stack"
            color="primary"
          />
        </div>
        <div class="col-md-6 col-lg-3">
          <app-stats-card
            label="Spent"
            [value]="spentAllowance() | peso"
            icon="bi-cart-dash"
            color="warning"
          />
        </div>
        <div class="col-md-6 col-lg-3">
          <app-stats-card
            label="Remaining"
            [value]="remainingAllowance() | peso"
            icon="bi-wallet"
            [color]="remainingColor()"
          />
        </div>
        <div class="col-md-6 col-lg-3">
          <app-stats-card
            label="Pending Requests"
            [value]="pendingCount().toString()"
            [subtitle]="pendingAmount() | peso"
            icon="bi-hourglass"
            color="info"
          />
        </div>
      </div>

      <!-- Allowance Progress -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">
              <i class="bi bi-piggy-bank me-2"></i>Allowance Usage
            </h6>
            <span class="badge" [class]="allowanceStatusClass()">
              {{ allowancePercentage() | number:'1.0-0' }}% used
            </span>
          </div>
          <div class="progress" style="height: 20px;">
            <div
              class="progress-bar"
              [class]="allowanceProgressClass()"
              role="progressbar"
              [style.width.%]="allowancePercentage()"
              [attr.aria-valuenow]="allowancePercentage()"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              {{ spentAllowance() | peso }}
            </div>
          </div>
          <div class="d-flex justify-content-between mt-2 small text-muted">
            <span>₱0</span>
            <span>{{ monthlyAllowance() | peso }}</span>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <!-- Recent Requests -->
        <div class="col-lg-8">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
              <h6 class="mb-0">
                <i class="bi bi-receipt me-2"></i>My Recent Requests
              </h6>
              <a routerLink="/user/history" class="btn btn-sm btn-outline-primary">
                View All
              </a>
            </div>
            <div class="card-body p-0">
              @if (myExpenses().length === 0) {
                <div class="text-center py-5 text-muted">
                  <i class="bi bi-inbox fs-1 mb-2 d-block"></i>
                  <p class="mb-0">No expense requests yet</p>
                  <a routerLink="/user/request" class="btn btn-primary btn-sm mt-2">
                    Submit Your First Request
                  </a>
                </div>
              } @else {
                <div class="table-responsive">
                  <table class="table table-hover mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th class="text-end">Amount</th>
                        <th class="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (expense of myExpenses().slice(0, 5); track expense.id) {
                        <tr>
                          <td>{{ expense.date | date:'MMM d' }}</td>
                          <td>
                            <span class="badge bg-secondary">
                              {{ expense.category | categoryName }}
                            </span>
                          </td>
                          <td>{{ expense.description }}</td>
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
        </div>

        <!-- Allowance Transactions -->
        <div class="col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
              <h6 class="mb-0">
                <i class="bi bi-list-check me-2"></i>Allowance History
              </h6>
              <a routerLink="/user/allowance" class="btn btn-sm btn-outline-primary">
                View All
              </a>
            </div>
            <div class="card-body p-0">
              @if (myTransactions().length === 0) {
                <div class="text-center py-5 text-muted">
                  <i class="bi bi-wallet2 fs-1 mb-2 d-block"></i>
                  <p class="mb-0">No transactions yet</p>
                </div>
              } @else {
                <ul class="list-group list-group-flush">
                  @for (transaction of myTransactions().slice(0, 5); track transaction.id) {
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <div class="fw-medium">{{ transaction.description }}</div>
                        <small class="text-muted">{{ transaction.date | date:'MMM d, y' }}</small>
                      </div>
                      <span class="text-danger fw-semibold">-{{ transaction.amount | peso }}</span>
                    </li>
                  }
                </ul>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Spending by Category -->
      <div class="card shadow-sm mt-4">
        <div class="card-header bg-white">
          <h6 class="mb-0">
            <i class="bi bi-pie-chart me-2"></i>Spending by Category
          </h6>
        </div>
        <div class="card-body">
          @if (hasSpendingCategories()) {
            <div class="row">
              @for (cat of spendingCategories(); track cat.category) {
                @if (cat.amount > 0) {
                  <div class="col-6 col-md-4 col-lg-3 mb-3">
                    <div class="d-flex align-items-center mb-1">
                      <span class="me-2">{{ getCategoryEmoji(cat.category) }}</span>
                      <span class="small">{{ getCategoryLabel(cat.category) }}</span>
                    </div>
                    <div class="d-flex align-items-center">
                      <div class="progress flex-grow-1 me-2" style="height: 8px;">
                        <div
                          class="progress-bar"
                          [class]="getCategoryProgressClass(cat.category)"
                          [style.width.%]="getCategoryPercentage(cat.amount)"
                        ></div>
                      </div>
                      <small class="fw-semibold">{{ cat.amount | peso }}</small>
                    </div>
                  </div>
                }
              }
            </div>
          } @else {
            <div class="text-center text-muted py-3">
              <i class="bi bi-pie-chart fs-3 mb-2 d-block"></i>
              <p class="mb-0 small">No categorized spending yet.</p>
              <a routerLink="/user/allowance" class="btn btn-sm btn-outline-primary mt-2">
                Record Spending
              </a>
            </div>
          }
        </div>
      </div>

      <!-- Quick Tips -->
      <div class="card bg-light border-0 mt-4">
        <div class="card-body">
          <h6 class="card-title">
            <i class="bi bi-lightbulb me-2 text-warning"></i>Quick Tips
          </h6>
          <ul class="mb-0 small">
            <li>Submit expense requests with clear descriptions for faster approval.</li>
            <li>Keep track of your allowance to avoid overspending.</li>
            <li>Approved expenses are automatically deducted from the family budget.</li>
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class UserDashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly expenseService = inject(ExpenseService);
  private readonly allowanceService = inject(AllowanceService);

  /** Current user's name */
  protected readonly userName = computed(() => this.authService.currentUser()?.name ?? 'User');

  /** Current user's ID */
  private readonly userId = computed(() => this.authService.currentUser()?.id ?? '');

  // Allowance data
  protected readonly monthlyAllowance = computed(() => {
    const allowance = this.allowanceService.getAllowanceForUser(this.userId());
    return allowance?.monthlyAmount ?? 0;
  });

  protected readonly spentAllowance = computed(() => {
    const allowance = this.allowanceService.getAllowanceForUser(this.userId());
    return allowance?.spent ?? 0;
  });

  // Dynamic color for remaining balance
  protected readonly remainingColor = computed(() => this.remainingAllowance() < 0 ? 'danger' : 'success');

  protected readonly remainingAllowance = computed(() => {
    return this.monthlyAllowance() - this.spentAllowance();
  });

  protected readonly allowancePercentage = computed(() => {
    const monthly = this.monthlyAllowance();
    if (monthly === 0) return 0;
    return Math.min((this.spentAllowance() / monthly) * 100, 100);
  });

  protected readonly allowanceStatusClass = computed(() => {
    const pct = this.allowancePercentage();
    if (pct >= 100) return 'bg-danger';
    if (pct >= 80) return 'bg-warning text-dark';
    return 'bg-success';
  });

  protected readonly allowanceProgressClass = computed(() => {
    const pct = this.allowancePercentage();
    if (pct >= 100) return 'bg-danger';
    if (pct >= 80) return 'bg-warning';
    return 'bg-success';
  });

  // Expense data
  protected readonly myExpenses = computed(() => {
    return this.expenseService.getExpensesByUser(this.userId());
  });

  protected readonly pendingCount = computed(() => {
    return this.myExpenses().filter((e) => e.status === 'pending').length;
  });

  protected readonly pendingAmount = computed(() => {
    return this.myExpenses()
      .filter((e) => e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);
  });

  // Allowance transactions
  protected readonly myTransactions = computed(() => {
    const allowance = this.allowanceService.getAllowanceForUser(this.userId());
    if (!allowance) return [];
    return this.allowanceService.getTransactionsForAllowance(allowance.id);
  });

  // Spending by category
  protected readonly spendingCategories = computed(() => {
    const byCategory = this.allowanceService.getSpendingByCategory(this.userId());
    return Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount
    }));
  });

  protected hasSpendingCategories(): boolean {
    return this.spendingCategories().some(c => c.amount > 0);
  }

  protected getCategoryPercentage(amount: number): number {
    const spent = this.spentAllowance();
    if (spent === 0) return 0;
    return (amount / spent) * 100;
  }

  protected getCategoryEmoji(category: string): string {
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes('food') || lowerCat.includes('snack')) return '🍔';
    if (lowerCat.includes('entertainment') || lowerCat.includes('game')) return '🎮';
    if (lowerCat.includes('school') || lowerCat.includes('supplies')) return '📚';
    if (lowerCat.includes('transport')) return '🚌';
    if (lowerCat.includes('cloth')) return '👕';
    if (lowerCat.includes('saving')) return '🐷';
    if (lowerCat.includes('gift')) return '🎁';
    return '📦';
  }

  protected getCategoryLabel(category: string): string {
    return category || 'Other';
  }

  protected getCategoryProgressClass(category: string): string {
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes('food') || lowerCat.includes('snack')) return 'bg-warning';
    if (lowerCat.includes('entertainment') || lowerCat.includes('game')) return 'bg-info';
    if (lowerCat.includes('school') || lowerCat.includes('supplies')) return 'bg-primary';
    if (lowerCat.includes('transport')) return 'bg-secondary';
    if (lowerCat.includes('cloth')) return 'bg-danger';
    if (lowerCat.includes('saving')) return 'bg-success';
    if (lowerCat.includes('gift')) return 'bg-danger';
    return 'bg-dark';
  }
}
