import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../../services';
import { BudgetCategory, BudgetCategoryType } from '../../../models';
import { BudgetCardComponent } from '../../../shared/components';
import { PesoPipe } from '../../../shared/pipes';

/**
 * Budget Management Component - Admin sets monthly budget and category limits
 *
 * TODO (PART 14): Add budget history/comparison view
 * TODO (PART 15): Add budget templates
 */
@Component({
  selector: 'app-budget-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, BudgetCardComponent, PesoPipe],
  styles: [`
    /* Desktop table - hide on mobile */
    .desktop-table {
      display: none;
    }

    /* Mobile cards - show on mobile */
    .mobile-cards {
      display: block;
    }

    @media (min-width: 768px) {
      .desktop-table {
        display: block;
      }

      .mobile-cards {
        display: none;
      }
    }

    /* Mobile category card */
    .category-card {
      background: white;
      border-radius: 1rem;
      padding: 1rem;
      margin-bottom: 0.75rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .category-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .category-card-header .category-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
    }

    .category-card-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .category-card-field label {
      font-size: 0.75rem;
      color: #6c757d;
      display: block;
      margin-bottom: 0.25rem;
    }

    .category-card-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e9ecef;
    }
  `],
  template: `
    <div class="container-fluid py-4">
      <!-- Page Header -->
      <div class="mb-4">
        <h1 class="h3 mb-1">Budget Management</h1>
        <p class="text-muted mb-0">Set monthly budget and manage category allocations.</p>
      </div>

      <!-- Success/Error Messages -->
      @if (successMessage()) {
        <div class="alert alert-success alert-dismissible fade show" role="alert">
          <i class="bi bi-check-circle me-2"></i>{{ successMessage() }}
          <button type="button" class="btn-close" (click)="successMessage.set('')"></button>
        </div>
      }

      <!-- Month/Year Selector & Income -->
      <div class="row g-4 mb-4">
        <div class="col-lg-6">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white">
              <h5 class="mb-0">
                <i class="bi bi-calendar3 me-2"></i>Budget Period
              </h5>
            </div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-6">
                  <label class="form-label">Month</label>
                  <select class="form-select" [(ngModel)]="selectedMonth" (change)="loadBudget()">
                    @for (month of months; track month.value) {
                      <option [value]="month.value">{{ month.name }}</option>
                    }
                  </select>
                </div>
                <div class="col-6">
                  <label class="form-label">Year</label>
                  <select class="form-select" [(ngModel)]="selectedYear" (change)="loadBudget()">
                    @for (year of years; track year) {
                      <option [value]="year">{{ year }}</option>
                    }
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="card shadow-sm h-100 border-primary">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0">
                <i class="bi bi-cash-coin me-2"></i>Monthly Budget
              </h5>
            </div>
            <div class="card-body">
              <div class="input-group input-group-lg mb-3">
                <span class="input-group-text">₱</span>
                <input
                  type="number"
                  class="form-control"
                  [(ngModel)]="monthlyBudget"
                  placeholder="0.00"
                  min="0"
                  step="100"
                />
              </div>
              <button class="btn btn-primary w-100" (click)="saveBudget()">
                <i class="bi bi-save me-2"></i>Save Budget
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Budget Summary -->
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="card bg-light h-100">
            <div class="card-body text-center">
              <small class="text-muted d-block">Total Budget</small>
              <h3 class="text-primary mb-0">{{ totalBudget() | peso }}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card bg-light h-100">
            <div class="card-body text-center">
              <small class="text-muted d-block">Total Allocated</small>
              <h3 class="text-info mb-0">{{ totalAllocated() | peso }}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card h-100" [class.bg-success]="unallocated() >= 0" [class.bg-danger]="unallocated() < 0" [class.bg-opacity-10]="true">
            <div class="card-body text-center">
              <small class="text-muted d-block">Unallocated</small>
              <h3 [class.text-success]="unallocated() >= 0" [class.text-danger]="unallocated() < 0" class="mb-0">
                {{ unallocated() | peso }}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Cards (View) -->
      <div class="row g-3 mb-4">
        <div class="col-12 d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="bi bi-pie-chart me-2"></i>Budget Categories
          </h5>
          <div class="d-flex gap-2">
            <button class="btn btn-success btn-sm" (click)="showAddCategory.set(true)">
              <i class="bi bi-plus-circle me-1"></i> Add Category
            </button>
            <button class="btn btn-outline-primary btn-sm" (click)="toggleEditMode()">
              @if (editMode()) {
                <i class="bi bi-eye me-1"></i> View Mode
              } @else {
                <i class="bi bi-pencil me-1"></i> Edit Limits
              }
            </button>
          </div>
        </div>
      </div>

      <!-- Add Category Modal -->
      @if (showAddCategory()) {
        <div class="card shadow-sm mb-4 border-success">
          <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
            <h6 class="mb-0"><i class="bi bi-plus-circle me-2"></i>Add New Category</h6>
            <button class="btn btn-sm btn-light" (click)="showAddCategory.set(false)">
              <i class="bi bi-x"></i>
            </button>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label">Category Name</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="newCategory.name"
                  placeholder="e.g., Pet Care"
                />
              </div>
              <div class="col-md-3">
                <label class="form-label">Monthly Limit</label>
                <div class="input-group">
                  <span class="input-group-text">₱</span>
                  <input
                    type="number"
                    class="form-control"
                    [(ngModel)]="newCategory.limit"
                    min="0"
                    step="100"
                  />
                </div>
              </div>
              <div class="col-md-2">
                <label class="form-label">Icon</label>
                <select class="form-select" [(ngModel)]="newCategory.icon">
                  <option value="bi-folder">📁 Folder</option>
                  <option value="bi-cart">🛒 Cart</option>
                  <option value="bi-house">🏠 House</option>
                  <option value="bi-car-front">🚗 Car</option>
                  <option value="bi-heart-pulse">❤️ Health</option>
                  <option value="bi-gift">🎁 Gift</option>
                  <option value="bi-controller">🎮 Games</option>
                  <option value="bi-airplane">✈️ Travel</option>
                  <option value="bi-heart-fill">🐾 Pet</option>
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label">Color</label>
                <select class="form-select" [(ngModel)]="newCategory.color">
                  <option value="primary">Blue</option>
                  <option value="success">Green</option>
                  <option value="warning">Yellow</option>
                  <option value="danger">Red</option>
                  <option value="info">Cyan</option>
                  <option value="secondary">Gray</option>
                  <option value="purple">Purple</option>
                  <option value="pink">Pink</option>
                  <option value="orange">Orange</option>
                  <option value="teal">Teal</option>
                  <option value="indigo">Indigo</option>
                  <option value="brown">Brown</option>
                  <option value="lime">Lime</option>
                  <option value="coral">Coral</option>
                  <option value="navy">Navy</option>
                </select>
              </div>
              <div class="col-md-1 d-flex align-items-end">
                <button
                  class="btn btn-success w-100"
                  (click)="addCategory()"
                  [disabled]="!newCategory.name.trim()"
                >
                  <i class="bi bi-plus"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (!editMode()) {
        <!-- View Mode -->
        <div class="row g-3">
          @for (category of categories(); track category.id) {
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
      } @else {
        <!-- Edit Mode -->
        <!-- Mobile Cards View -->
        <div class="mobile-cards">
          @for (category of categories(); track category.id; let i = $index) {
            <div class="category-card">
              <div class="category-card-header">
                <div class="category-name">
                  <i [class]="'bi ' + (category.icon || 'bi-folder') + ' text-' + (category.color || 'primary')"></i>
                  {{ category.name }}
                </div>
                <span class="badge bg-warning text-dark">{{ category.warningThreshold * 100 }}%</span>
              </div>
              <div class="category-card-body">
                <div class="category-card-field">
                  <label>Current Spent</label>
                  <span [class.text-danger]="category.spent > category.monthlyLimit" class="fw-semibold">
                    {{ category.spent | peso }}
                  </span>
                </div>
                <div class="category-card-field">
                  <label>Monthly Limit</label>
                  <div class="input-group input-group-sm">
                    <span class="input-group-text">₱</span>
                    <input
                      type="number"
                      class="form-control"
                      [(ngModel)]="categoryLimits[i]"
                      min="0"
                      step="100"
                    />
                  </div>
                </div>
              </div>
              <div class="category-card-actions">
                <button
                  class="btn btn-sm btn-outline-danger"
                  (click)="deleteCategory(category)"
                >
                  <i class="bi bi-trash me-1"></i>Delete
                </button>
              </div>
            </div>
          }
          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-primary flex-grow-1" (click)="saveAllLimits()">
              <i class="bi bi-save me-2"></i>Save All
            </button>
            <button class="btn btn-outline-secondary" (click)="resetLimits()">
              <i class="bi bi-arrow-counterclockwise"></i>
            </button>
          </div>
        </div>

        <!-- Desktop Table View -->
        <div class="desktop-table">
          <div class="card shadow-sm">
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Category</th>
                      <th>Current Spent</th>
                      <th style="width: 200px;">Monthly Limit</th>
                      <th class="text-center">Warning</th>
                      <th class="text-center" style="width: 100px;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (category of categories(); track category.id; let i = $index) {
                      <tr>
                        <td>
                          <div class="d-flex align-items-center">
                            <i [class]="'bi ' + (category.icon || 'bi-folder') + ' me-2 text-' + (category.color || 'primary')"></i>
                            <span class="fw-medium">{{ category.name }}</span>
                          </div>
                        </td>
                        <td>
                          <span [class.text-danger]="category.spent > category.monthlyLimit">
                            {{ category.spent | peso }}
                          </span>
                        </td>
                        <td>
                          <div class="input-group input-group-sm">
                            <span class="input-group-text">₱</span>
                            <input
                              type="number"
                              class="form-control"
                              [(ngModel)]="categoryLimits[i]"
                              min="0"
                              step="100"
                            />
                          </div>
                        </td>
                        <td class="text-center">
                          <span class="badge bg-warning text-dark">{{ category.warningThreshold * 100 }}%</span>
                        </td>
                        <td class="text-center">
                          <button
                            class="btn btn-sm btn-outline-danger"
                            (click)="deleteCategory(category)"
                            title="Delete category"
                          >
                            <i class="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
            <div class="card-footer bg-white">
              <button class="btn btn-primary" (click)="saveAllLimits()">
                <i class="bi bi-save me-2"></i>Save All Changes
              </button>
              <button class="btn btn-outline-secondary ms-2" (click)="resetLimits()">
                <i class="bi bi-arrow-counterclockwise me-2"></i>Reset
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Quick Tips -->
      <div class="card bg-light border-0 mt-4">
        <div class="card-body">
          <h6 class="card-title">
            <i class="bi bi-lightbulb me-2 text-warning"></i>Budget Tips
          </h6>
          <ul class="mb-0 small">
            <li>Set your monthly budget first, then allocate to categories.</li>
            <li>Keep some budget unallocated for unexpected expenses.</li>
            <li>Categories at 80% will show warning alerts on dashboards.</li>
            <li>Review and adjust budgets monthly based on spending patterns.</li>
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class BudgetManagementComponent {
  private readonly budgetService = inject(BudgetService);

  /** Selected period */
  protected selectedMonth = new Date().getMonth() + 1;
  protected selectedYear = new Date().getFullYear();

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

  /** Year options (current year +/- 1) */
  protected readonly years = [
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
  ];

  /** Form state */
  protected monthlyBudget = 0;
  protected categoryLimits: number[] = [];
  protected readonly editMode = signal(false);
  protected readonly successMessage = signal('');
  protected readonly showAddCategory = signal(false);
  protected newCategory = {
    name: '',
    limit: 0,
    icon: 'bi-folder',
    color: 'primary'
  };
  protected readonly availableIcons = [
    'bi-house', 'bi-lightning', 'bi-droplet', 'bi-wifi', 'bi-cart',
    'bi-truck', 'bi-heart-pulse', 'bi-book', 'bi-controller', 'bi-gift',
    'bi-piggy-bank', 'bi-folder', 'bi-car-front', 'bi-phone', 'bi-music-note', 'bi-heart-fill'
  ];
  protected readonly availableColors = [
    'primary', 'success', 'info', 'warning', 'danger', 'secondary',
    'purple', 'pink', 'orange', 'teal', 'indigo', 'brown', 'lime', 'coral', 'navy'
  ];

  /** Budget data */
  protected readonly categories = computed(() => {
    const budget = this.budgetService.getBudgetForMonth(this.selectedMonth, this.selectedYear);
    return budget?.categories ?? [];
  });

  protected readonly totalBudget = computed(() => {
    const budget = this.budgetService.getBudgetForMonth(this.selectedMonth, this.selectedYear);
    return budget?.totalBudget ?? 0;
  });

  protected readonly totalAllocated = computed(() => {
    return this.categories().reduce((sum, cat) => sum + cat.monthlyLimit, 0);
  });

  protected readonly unallocated = computed(() => {
    return this.totalBudget() - this.totalAllocated();
  });

  constructor() {
    this.loadBudget();
  }

  /**
   * Load budget for selected period
   */
  protected loadBudget(): void {
    const budget = this.budgetService.getBudgetForMonth(this.selectedMonth, this.selectedYear);
    this.monthlyBudget = budget?.totalBudget ?? 0;
    this.categoryLimits = this.categories().map((c) => c.monthlyLimit);
  }

  /**
   * Toggle between view and edit mode
   */
  protected toggleEditMode(): void {
    this.editMode.set(!this.editMode());
    if (this.editMode()) {
      this.categoryLimits = this.categories().map((c) => c.monthlyLimit);
    }
  }

  /**
   * Save monthly budget
   */
  protected async saveBudget(): Promise<void> {
    console.log('saveBudget called with:', this.selectedMonth, this.selectedYear, this.monthlyBudget);
    const result = await this.budgetService.setMonthlyBudget(this.selectedMonth, this.selectedYear, this.monthlyBudget);
    console.log('setMonthlyBudget result:', result);
    if (result) {
      this.successMessage.set('Monthly budget updated successfully!');
    } else {
      this.successMessage.set('Error saving budget!');
    }
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  /**
   * Save a single category limit
   */
  protected async saveCategoryLimit(category: BudgetCategory, index: number): Promise<void> {
    const newLimit = this.categoryLimits[index];
    await this.budgetService.updateCategoryLimit(
      this.selectedMonth,
      this.selectedYear,
      category.type,
      newLimit
    );
    this.successMessage.set(`${category.name} limit updated!`);
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  /**
   * Save all category limits
   */
  protected async saveAllLimits(): Promise<void> {
    const cats = this.categories();
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i];
      if (this.categoryLimits[i] !== cat.monthlyLimit) {
        await this.budgetService.updateCategoryLimit(
          this.selectedMonth,
          this.selectedYear,
          cat.type,
          this.categoryLimits[i]
        );
      }
    }
    this.successMessage.set('All budget limits updated successfully!');
    this.editMode.set(false);
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  /**
   * Reset limits to current values
   */
  protected resetLimits(): void {
    this.categoryLimits = this.categories().map((c) => c.monthlyLimit);
  }

  /**
   * Add a new category
   */
  protected async addCategory(): Promise<void> {
    if (!this.newCategory.name.trim() || this.newCategory.limit < 0) {
      return;
    }

    const result = await this.budgetService.addCategory(
      this.selectedMonth,
      this.selectedYear,
      this.newCategory.name.trim(),
      this.newCategory.limit,
      this.newCategory.icon,
      this.newCategory.color
    );

    if (result) {
      this.successMessage.set(`Category "${this.newCategory.name}" added successfully!`);
      this.newCategory = { name: '', limit: 0, icon: 'bi-folder', color: 'primary' };
      this.showAddCategory.set(false);
      this.loadBudget();
    } else {
      this.successMessage.set('Error adding category!');
    }
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  /**
   * Delete a category
   */
  protected async deleteCategory(category: BudgetCategory): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This cannot be undone.`)) {
      return;
    }

    const result = await this.budgetService.deleteCategory(
      this.selectedMonth,
      this.selectedYear,
      category.id
    );

    if (result) {
      this.successMessage.set(`Category "${category.name}" deleted!`);
      this.loadBudget();
    } else {
      this.successMessage.set('Error deleting category!');
    }
    setTimeout(() => this.successMessage.set(''), 3000);
  }
}
