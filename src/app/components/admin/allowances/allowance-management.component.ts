import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AllowanceService } from '../../../services';
import { Allowance, User, Role } from '../../../models';
import { PesoPipe } from '../../../shared/pipes';

/**
 * Allowance Management Component - Admin sets and manages user allowances
 *
 * TODO (PART 16): Add allowance history per user
 * TODO (PART 17): Add batch allowance update
 */
@Component({
  selector: 'app-allowance-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DecimalPipe, PesoPipe],
  template: `
    <div class="container-fluid py-4">
      <!-- Page Header -->
      <div class="mb-4">
        <h1 class="h3 mb-1">Allowance Management</h1>
        <p class="text-muted mb-0">Manage monthly allowances for family members.</p>
      </div>

      <!-- Success Message -->
      @if (successMessage()) {
        <div class="alert alert-success alert-dismissible fade show" role="alert">
          <i class="bi bi-check-circle me-2"></i>{{ successMessage() }}
          <button type="button" class="btn-close" (click)="successMessage.set('')"></button>
        </div>
      }

      <!-- Summary Cards -->
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="card bg-primary bg-opacity-10 border-primary h-100">
            <div class="card-body text-center">
              <h3 class="text-primary mb-1">{{ totalAllowances() | peso }}</h3>
              <small class="text-muted">Total Monthly Allowances</small>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card bg-warning bg-opacity-10 border-warning h-100">
            <div class="card-body text-center">
              <h3 class="text-warning mb-1">{{ totalSpent() | peso }}</h3>
              <small class="text-muted">Total Spent This Month</small>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card bg-success bg-opacity-10 border-success h-100">
            <div class="card-body text-center">
              <h3 class="text-success mb-1">{{ totalRemaining() | peso }}</h3>
              <small class="text-muted">Total Remaining</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Period Selector -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="row align-items-end g-3">
            <div class="col-md-3">
              <label class="form-label">Month</label>
              <select class="form-select" (change)="onMonthChange($event)">
                @for (month of months; track month.value) {
                  <option [value]="month.value" [selected]="month.value === selectedMonth()">{{ month.name }}</option>
                }
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Year</label>
              <select class="form-select" (change)="onYearChange($event)">
                @for (year of years; track year) {
                  <option [value]="year" [selected]="year === selectedYear()">{{ year }}</option>
                }
              </select>
            </div>
            <div class="col-md-6 text-md-end">
              <button class="btn btn-primary" (click)="openAddModal()">
                <i class="bi bi-plus-circle me-2"></i>Set Allowance
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Allowances Table -->
      <div class="card shadow-sm">
        <div class="card-header bg-white">
          <h5 class="mb-0">
            <i class="bi bi-people me-2"></i>Family Allowances - {{ getMonthName(selectedMonth()) }} {{ selectedYear() }}
          </h5>
        </div>
        <div class="card-body p-0">
          @if (allowances().length === 0) {
            <div class="text-center py-5 text-muted">
              <i class="bi bi-wallet2 fs-1 mb-2 d-block"></i>
              <p class="mb-2">No allowances set for this month.</p>
              <button class="btn btn-primary btn-sm" (click)="openAddModal()">
                <i class="bi bi-plus-circle me-1"></i> Set Allowances
              </button>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Family Member</th>
                    <th>Monthly Allowance</th>
                    <th>Spent</th>
                    <th>Remaining</th>
                    <th>Usage</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (allowance of allowances(); track allowance.id) {
                    <tr>
                      <td>
                        <div class="d-flex align-items-center">
                          <i class="bi bi-person-circle me-2 fs-4 text-muted"></i>
                          <div>
                            <div class="fw-medium">{{ allowance.userName }}</div>
                            <small class="text-muted">User ID: {{ allowance.userId }}</small>
                          </div>
                        </div>
                      </td>
                      <td class="fw-semibold">{{ allowance.monthlyAmount | peso }}</td>
                      <td>
                        <span [class.text-danger]="allowance.spent > allowance.monthlyAmount">
                          {{ allowance.spent | peso }}
                        </span>
                      </td>
                      <td>
                        <span [class]="getRemainingClass(allowance)">
                          {{ (allowance.monthlyAmount - allowance.spent) | peso }}
                        </span>
                      </td>
                      <td style="width: 200px;">
                        <div class="d-flex align-items-center">
                          <div class="progress flex-grow-1 me-2" style="height: 8px;">
                            <div
                              class="progress-bar"
                              [class]="getProgressClass(allowance)"
                              [style.width.%]="getUsagePercentage(allowance)"
                            ></div>
                          </div>
                          <small class="text-muted" style="width: 40px;">
                            {{ getUsagePercentage(allowance) | number:'1.0-0' }}%
                          </small>
                        </div>
                      </td>
                      <td class="text-center">
                        <button
                          class="btn btn-sm btn-outline-primary"
                          (click)="openEditModal(allowance)"
                          title="Edit Allowance"
                        >
                          <i class="bi bi-pencil"></i>
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

      <!-- Users Without Allowance -->
      @if (usersWithoutAllowance().length > 0) {
        <div class="card shadow-sm mt-4">
          <div class="card-header bg-warning bg-opacity-10">
            <h6 class="mb-0 text-warning">
              <i class="bi bi-exclamation-circle me-2"></i>Users Without Allowance This Month
            </h6>
          </div>
          <div class="card-body">
            <div class="d-flex flex-wrap gap-2">
              @for (user of usersWithoutAllowance(); track user.id) {
                <button class="btn btn-outline-secondary" (click)="openAddModalForUser(user)">
                  <i class="bi bi-person-plus me-1"></i>{{ user.name }}
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-cash-stack text-primary me-2"></i>
                  {{ editingAllowance() ? 'Edit' : 'Set' }} Allowance
                </h5>
                <button type="button" class="btn-close" (click)="closeModal()"></button>
              </div>
              <div class="modal-body">
                <!-- User Selection (for new allowance) -->
                @if (!editingAllowance()) {
                  <div class="mb-3">
                    <label class="form-label">Family Member</label>
                    <select class="form-select" [(ngModel)]="formUserId">
                      <option value="">Select a user...</option>
                      @for (user of usersWithoutAllowance(); track user.id) {
                        <option [value]="user.id">{{ user.name }}</option>
                      }
                    </select>
                  </div>
                } @else {
                  <div class="mb-3">
                    <label class="form-label">Family Member</label>
                    <input type="text" class="form-control" [value]="editingAllowance()?.userName" disabled />
                  </div>
                }

                <!-- Amount -->
                <div class="mb-3">
                  <label class="form-label">Monthly Allowance</label>
                  <div class="input-group">
                    <span class="input-group-text">₱</span>
                    <input
                      type="number"
                      class="form-control"
                      [(ngModel)]="formAmount"
                      min="0"
                      step="100"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <!-- Quick Amount Buttons -->
                <div class="mb-3">
                  <label class="form-label small text-muted">Quick Set:</label>
                  <div class="d-flex flex-wrap gap-2">
                    @for (amount of quickAmounts; track amount) {
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary"
                        (click)="formAmount = amount"
                      >
                        {{ amount | peso }}
                      </button>
                    }
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="saveAllowance()"
                  [disabled]="!canSave()"
                >
                  <i class="bi bi-save me-1"></i>Save Allowance
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AllowanceManagementComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly allowanceService = inject(AllowanceService);

  /** Available users loaded from Firestore */
  protected readonly availableUsers = signal<User[]>([]);

  /** Selected period */
  protected readonly selectedMonth = signal(new Date().getMonth() + 1);
  protected readonly selectedYear = signal(new Date().getFullYear());

  /** Month options */
  protected readonly months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  /** Year options */
  protected readonly years = [
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
  ];

  /** Quick amount buttons */
  protected readonly quickAmounts = [1000, 1500, 2000, 2500, 3000, 5000];

  /** State signals */
  protected readonly successMessage = signal('');
  protected readonly showModal = signal(false);
  protected readonly editingAllowance = signal<Allowance | null>(null);

  /** Form fields */
  protected formUserId = '';
  protected formAmount = 0;

  /** Allowances for selected period */
  protected readonly allowances = computed(() => {
    return this.allowanceService.allowances().filter(
      (a) => a.month === this.selectedMonth() && a.year === this.selectedYear()
    );
  });

  /** Users who don't have allowance this month */
  protected readonly usersWithoutAllowance = computed(() => {
    const users = this.availableUsers().filter((u) => u.role === Role.USER);
    const existingUserIds = this.allowances().map((a) => a.userId);
    return users.filter((u) => !existingUserIds.includes(u.id));
  });

  /** Summary calculations */
  protected readonly totalAllowances = computed(() =>
    this.allowances().reduce((sum, a) => sum + a.monthlyAmount, 0)
  );

  protected readonly totalSpent = computed(() =>
    this.allowances().reduce((sum, a) => sum + a.spent, 0)
  );

  protected readonly totalRemaining = computed(() =>
    this.totalAllowances() - this.totalSpent()
  );

  /**
   * Initialize - load users on component init
   */
  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  /**
   * Load available users from Firestore
   */
  private async loadUsers(): Promise<void> {
    const users = await this.authService.getUsersByRole(Role.USER);
    this.availableUsers.set(users);
  }

  /**
   * Get month name from value
   */
  protected getMonthName(month: number): string {
    return this.months.find((m) => m.value === month)?.name ?? '';
  }

  /**
   * Get usage percentage for an allowance
   */
  protected getUsagePercentage(allowance: Allowance): number {
    if (allowance.monthlyAmount === 0) return 0;
    return Math.min((allowance.spent / allowance.monthlyAmount) * 100, 100);
  }

  /**
   * Get progress bar class based on usage
   */
  protected getProgressClass(allowance: Allowance): string {
    const pct = this.getUsagePercentage(allowance);
    if (pct >= 100) return 'bg-danger';
    if (pct >= 80) return 'bg-warning';
    return 'bg-success';
  }

  /**
   * Get remaining amount class
   */
  protected getRemainingClass(allowance: Allowance): string {
    const remaining = allowance.monthlyAmount - allowance.spent;
    if (remaining < 0) return 'text-danger fw-semibold';
    if (remaining < allowance.monthlyAmount * 0.2) return 'text-warning';
    return 'text-success';
  }

  /**
   * Open add modal
   */
  protected openAddModal(): void {
    this.editingAllowance.set(null);
    this.formUserId = '';
    this.formAmount = 2000; // Default amount
    this.showModal.set(true);
  }

  /**
   * Open add modal for specific user
   */
  protected openAddModalForUser(user: { id: string; name: string }): void {
    this.editingAllowance.set(null);
    this.formUserId = user.id;
    this.formAmount = 2000;
    this.showModal.set(true);
  }

  /**
   * Open edit modal
   */
  protected openEditModal(allowance: Allowance): void {
    this.editingAllowance.set(allowance);
    this.formUserId = allowance.userId;
    this.formAmount = allowance.monthlyAmount;
    this.showModal.set(true);
  }

  /**
   * Close modal
   */
  protected closeModal(): void {
    this.showModal.set(false);
    this.editingAllowance.set(null);
    this.formUserId = '';
    this.formAmount = 0;
  }

  /**
   * Check if form can be saved
   */
  protected canSave(): boolean {
    if (this.editingAllowance()) {
      return this.formAmount >= 0;
    }
    return this.formUserId !== '' && this.formAmount >= 0;
  }

  /**
   * Save allowance
   */
  protected async saveAllowance(): Promise<void> {
    if (!this.canSave()) return;

    const editing = this.editingAllowance();

    if (editing) {
      // Update existing
      await this.allowanceService.setAllowance(
        editing.userId,
        editing.userName,
        this.formAmount,
        this.selectedMonth(),
        this.selectedYear()
      );
      this.successMessage.set(`Allowance for ${editing.userName} updated successfully!`);
    } else {
      // Create new
      const user = this.availableUsers().find((u) => u.id === this.formUserId);
      if (user) {
        await this.allowanceService.setAllowance(
          user.id,
          user.name,
          this.formAmount,
          this.selectedMonth(),
          this.selectedYear()
        );
        this.successMessage.set(`Allowance for ${user.name} set successfully!`);
      }
    }

    this.closeModal();
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  /**
   * Handle month change
   */
  protected onMonthChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedMonth.set(parseInt(value, 10));
  }

  /**
   * Handle year change
   */
  protected onYearChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedYear.set(parseInt(value, 10));
  }
}
