import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, ExpenseService, BudgetService } from '../../../services';
import { BudgetCategoryType } from '../../../models';

/**
 * Expense Request Component - Allows users to submit expense requests
 */
@Component({
  selector: 'app-expense-request',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <div class="container py-4">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <!-- Page Header -->
          <div class="d-flex align-items-center mb-4">
            <a routerLink="/user" class="btn btn-outline-secondary me-3">
              <i class="bi bi-arrow-left"></i>
            </a>
            <div>
              <h1 class="h3 mb-1">New Expense Request</h1>
              <p class="text-muted mb-0">Submit a request for approval by the budget holder.</p>
            </div>
          </div>

          <!-- Success Message -->
          @if (successMessage()) {
            <div class="alert alert-success d-flex align-items-center" role="alert">
              <i class="bi bi-check-circle-fill me-2"></i>
              <div>{{ successMessage() }}</div>
            </div>
          }

          <!-- Error Message -->
          @if (errorMessage()) {
            <div class="alert alert-danger d-flex align-items-center" role="alert">
              <i class="bi bi-exclamation-circle-fill me-2"></i>
              <div>{{ errorMessage() }}</div>
            </div>
          }

          <!-- Request Form -->
          <div class="card shadow-sm">
            <div class="card-body p-4">
              <form [formGroup]="expenseForm" (ngSubmit)="onSubmit()">
                <!-- Amount -->
                <div class="mb-4">
                  <label for="amount" class="form-label fw-semibold">
                    <i class="bi bi-currency-dollar me-1"></i>Amount
                  </label>
                  <div class="input-group input-group-lg">
                    <span class="input-group-text">₱</span>
                    <input
                      type="number"
                      class="form-control"
                      id="amount"
                      formControlName="amount"
                      placeholder="0.00"
                      min="1"
                      step="0.01"
                      [class.is-invalid]="isFieldInvalid('amount')"
                    />
                  </div>
                  @if (isFieldInvalid('amount')) {
                    <div class="invalid-feedback d-block">
                      @if (expenseForm.get('amount')?.errors?.['required']) {
                        Amount is required.
                      } @else if (expenseForm.get('amount')?.errors?.['min']) {
                        Amount must be greater than 0.
                      }
                    </div>
                  }
                </div>

                <!-- Category -->
                <div class="mb-4">
                  <label for="category" class="form-label fw-semibold">
                    <i class="bi bi-tag me-1"></i>Category
                  </label>
                  <select
                    class="form-select form-select-lg"
                    id="category"
                    formControlName="categoryId"
                    [class.is-invalid]="isFieldInvalid('categoryId')"
                  >
                    <option value="">Select a category...</option>
                    @for (cat of categories(); track cat.id) {
                      <option [value]="cat.id">{{ cat.label }}</option>
                    }
                  </select>
                  @if (isFieldInvalid('categoryId')) {
                    <div class="invalid-feedback d-block">
                      Please select a category.
                    </div>
                  }
                </div>

                <!-- Description -->
                <div class="mb-4">
                  <label for="description" class="form-label fw-semibold">
                    <i class="bi bi-card-text me-1"></i>Description
                  </label>
                  <textarea
                    class="form-control"
                    id="description"
                    formControlName="description"
                    rows="3"
                    placeholder="Describe what this expense is for..."
                    [class.is-invalid]="isFieldInvalid('description')"
                  ></textarea>
                  @if (isFieldInvalid('description')) {
                    <div class="invalid-feedback d-block">
                      @if (expenseForm.get('description')?.errors?.['required']) {
                        Description is required.
                      } @else if (expenseForm.get('description')?.errors?.['minlength']) {
                        Description must be at least 5 characters.
                      }
                    </div>
                  }
                  <div class="form-text">
                    Provide a clear description to help with faster approval.
                  </div>
                </div>

                <!-- Date -->
                <div class="mb-4">
                  <label for="date" class="form-label fw-semibold">
                    <i class="bi bi-calendar me-1"></i>Date
                  </label>
                  <input
                    type="date"
                    class="form-control"
                    id="date"
                    formControlName="date"
                    [class.is-invalid]="isFieldInvalid('date')"
                  />
                  @if (isFieldInvalid('date')) {
                    <div class="invalid-feedback d-block">
                      Date is required.
                    </div>
                  }
                </div>

                <!-- Form Actions -->
                <div class="d-flex gap-2 pt-3 border-top">
                  <button
                    type="submit"
                    class="btn btn-primary btn-lg"
                    [disabled]="isSubmitting()"
                  >
                    @if (isSubmitting()) {
                      <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                      Submitting...
                    } @else {
                      <i class="bi bi-send me-2"></i>Submit Request
                    }
                  </button>
                  <a routerLink="/user" class="btn btn-outline-secondary btn-lg">
                    Cancel
                  </a>
                </div>
              </form>
            </div>
          </div>

          <!-- Guidelines -->
          <div class="card bg-light border-0 mt-4">
            <div class="card-body">
              <h6 class="card-title">
                <i class="bi bi-info-circle me-2 text-info"></i>Submission Guidelines
              </h6>
              <ul class="mb-0 small">
                <li>Ensure the amount is accurate and matches any receipts.</li>
                <li>Select the most appropriate category for your expense.</li>
                <li>Provide detailed descriptions for faster approval.</li>
                <li>Requests are reviewed by the budget holder within 24 hours.</li>
                <li>Approved expenses will be deducted from the family budget.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ExpenseRequestComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly expenseService = inject(ExpenseService);
  private readonly budgetService = inject(BudgetService);

  /** Available expense categories - dynamically loaded from current budget */
  protected readonly categories = computed(() => {
    const budget = this.budgetService.currentBudget();
    if (!budget) return [];
    return budget.categories.map(cat => ({
      value: cat.type,
      label: cat.name,
      id: cat.id
    }));
  });

  /** Form state signals */
  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  /** Expense request form */
  protected readonly expenseForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    categoryId: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(5)]],
    date: [this.getTodayString(), Validators.required],
  });

  /** Get category info from ID */
  private getCategoryById(categoryId: string) {
    return this.categories().find(c => c.id === categoryId);
  }

  /**
   * Get today's date as YYYY-MM-DD string
   */
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Check if a form field is invalid and touched
   */
  protected isFieldInvalid(fieldName: string): boolean {
    const field = this.expenseForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  /**
   * Submit the expense request
   */
  protected async onSubmit(): Promise<void> {
    // Mark all fields as touched to show validation errors
    this.expenseForm.markAllAsTouched();

    if (this.expenseForm.invalid) {
      this.errorMessage.set('Please correct the errors in the form.');
      return;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.errorMessage.set('You must be logged in to submit a request.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const formValue = this.expenseForm.value;
    const category = this.getCategoryById(formValue.categoryId!);

    if (!category) {
      this.errorMessage.set('Please select a valid category.');
      this.isSubmitting.set(false);
      return;
    }

    try {
      const result = await this.expenseService.submitExpense(
        currentUser.id,
        currentUser.name,
        formValue.amount!,
        category.value,
        formValue.description!,
        new Date(formValue.date!),
        formValue.categoryId!
      );

      if (result) {
        this.successMessage.set('Your expense request has been submitted successfully!');
        this.expenseForm.reset({
          date: this.getTodayString(),
        });

        // Navigate back to dashboard after delay
        setTimeout(() => {
          this.router.navigate(['/user']);
        }, 2000);
      } else {
        this.errorMessage.set('Failed to submit request. Please try again.');
      }
    } catch (error) {
      this.errorMessage.set('Failed to submit request. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
