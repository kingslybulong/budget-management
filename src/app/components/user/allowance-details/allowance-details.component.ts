import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AllowanceService } from '../../../services';
import { SavingsGoal } from '../../../models';
import { PesoPipe } from '../../../shared/pipes';

/**
 * Allowance Details Component - Enhanced with statistics, savings goals, and spending categories
 */
@Component({
  selector: 'app-allowance-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, PesoPipe],
  styles: [`
    /* Tab navigation - horizontal scrollable on mobile */
    .nav-tabs {
      flex-wrap: nowrap;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .nav-tabs::-webkit-scrollbar {
      display: none;
    }

    .nav-tabs .nav-item {
      flex-shrink: 0;
    }

    .nav-tabs .nav-link {
      white-space: nowrap;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
    }

    @media (min-width: 768px) {
      .nav-tabs .nav-link {
        padding: 0.5rem 1rem;
        font-size: 1rem;
      }
    }

    /* Compact page header on mobile */
    .page-header h1 {
      font-size: 1.25rem;
    }

    .page-header p {
      font-size: 0.8rem;
    }

    @media (min-width: 768px) {
      .page-header h1 {
        font-size: 1.5rem;
      }

      .page-header p {
        font-size: 0.875rem;
      }
    }

    /* Savings badges - responsive sizing */
    .savings-badges .badge {
      font-size: 0.7rem;
      padding: 0.35rem 0.5rem;
    }

    @media (min-width: 576px) {
      .savings-badges .badge {
        font-size: 0.875rem;
        padding: 0.5rem 0.75rem;
      }
    }

    @media (min-width: 768px) {
      .savings-badges .badge {
        font-size: 1rem;
        padding: 0.5rem 1rem;
      }
    }
  `],
  template: `
    <div class="container-fluid py-3 py-md-4">
      <!-- Page Header -->
      <div class="page-header mb-3 mb-md-4">
        <h1 class="mb-1">My Allowance</h1>
        <p class="text-muted mb-0">Track your spending, savings, and financial goals.</p>
      </div>

      <!-- Tab Navigation -->
      <ul class="nav nav-tabs mb-3 mb-md-4">
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab() === 'overview'" (click)="activeTab.set('overview')">
            <i class="bi bi-wallet2 me-1"></i><span class="d-none d-sm-inline">Overview</span><span class="d-sm-none">Overview</span>
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab() === 'statistics'" (click)="activeTab.set('statistics')">
            <i class="bi bi-graph-up me-1"></i><span class="d-none d-sm-inline">Statistics</span><span class="d-sm-none">Stats</span>
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab() === 'savings'" (click)="activeTab.set('savings')">
            <i class="bi bi-piggy-bank me-1"></i><span class="d-none d-sm-inline">Savings Goals</span><span class="d-sm-none">Savings</span>
          </button>
        </li>
      </ul>

      <!-- ==================== OVERVIEW TAB ==================== -->
      @if (activeTab() === 'overview') {
        <!-- Month Selector -->
        <div class="card shadow-sm mb-4">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <label class="form-label mb-0">View Month:</label>
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

        <!-- Allowance Overview Cards -->
        <div class="row g-4 mb-4">
          <!-- Main Allowance Card -->
          <div class="col-lg-8">
            <div class="card shadow-sm h-100">
              <div class="card-header bg-primary text-white">
                <h5 class="mb-0">
                  <i class="bi bi-wallet2 me-2"></i>Allowance Overview
                </h5>
              </div>
              <div class="card-body">
                @if (currentAllowance()) {
                  <div class="row text-center mb-4">
                    <div class="col-md-4">
                      <div class="border-end">
                        <h2 class="text-primary mb-1">{{ currentAllowance()!.monthlyAmount | peso }}</h2>
                        <small class="text-muted">Monthly Allowance</small>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="border-end">
                        <h2 class="text-warning mb-1">{{ currentAllowance()!.spent | peso }}</h2>
                        <small class="text-muted">Spent</small>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <h2 class="mb-1" [class.text-success]="remainingAmount() > 0" [class.text-danger]="remainingAmount() <= 0">
                        {{ remainingAmount() | peso }}
                      </h2>
                      <small class="text-muted">Remaining</small>
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  <div class="mb-3">
                    <div class="d-flex justify-content-between mb-1">
                      <small>Spending Progress</small>
                      <small>{{ spendingPercentage() }}%</small>
                    </div>
                    <div class="progress" style="height: 20px;">
                      <div
                        class="progress-bar"
                        [class.bg-success]="spendingPercentage() < 70"
                        [class.bg-warning]="spendingPercentage() >= 70 && spendingPercentage() < 90"
                        [class.bg-danger]="spendingPercentage() >= 90"
                        [style.width.%]="Math.min(spendingPercentage(), 100)"
                      ></div>
                    </div>
                </div>

                  <!-- Savings Rate Badge -->
                  <div class="savings-badges d-flex align-items-center justify-content-center gap-2 mb-3">
                    <div class="badge bg-success">
                      <i class="bi bi-piggy-bank me-1"></i>
                      <span class="d-none d-sm-inline">Savings Rate:</span>
                      <span class="d-sm-none">Savings:</span> {{ savingsRate() }}%
                    </div>
                    <div class="badge bg-info">
                      <i class="bi bi-coin me-1"></i>
                      <span class="d-none d-sm-inline">Total Saved:</span>
                      <span class="d-sm-none">Saved:</span> {{ totalSavings() | peso }}
                    </div>
                  </div>

                <!-- Status Message -->
                @if (spendingPercentage() < 50) {
                  <div class="alert alert-success mb-0">
                    <i class="bi bi-emoji-smile me-2"></i>
                    <strong>Great job!</strong> You're saving {{ savingsRate() }}% of your allowance this month!
                  </div>
                } @else if (spendingPercentage() < 80) {
                  <div class="alert alert-info mb-0">
                    <i class="bi bi-info-circle me-2"></i>
                    <strong>On track!</strong> You've used {{ spendingPercentage() }}% of your allowance.
                  </div>
                } @else if (spendingPercentage() < 100) {
                  <div class="alert alert-warning mb-0">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <strong>Caution!</strong> Consider slowing down your spending.
                  </div>
                } @else {
                  <div class="alert alert-danger mb-0">
                    <i class="bi bi-x-circle me-2"></i>
                    <strong>Over budget!</strong> Try to save more next month.
                  </div>
                }
              } @else {
                <div class="text-center py-4 text-muted">
                  <i class="bi bi-wallet fs-1 mb-2 d-block"></i>
                  <p class="mb-0">No allowance set for this month.</p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white">
              <h6 class="mb-0">
                <i class="bi bi-bar-chart me-2"></i>Quick Stats
              </h6>
            </div>
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <span class="text-muted">Daily Average Spent</span>
                <span class="fw-semibold">{{ dailyAverage() | peso }}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <span class="text-muted">Days Left in Month</span>
                <span class="fw-semibold">{{ daysLeftInMonth() }}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <span class="text-muted">Daily Budget Left</span>
                <span class="fw-semibold" [class.text-danger]="dailyBudgetLeft() <= 0" [class.text-success]="dailyBudgetLeft() > 0">
                  {{ dailyBudgetLeft() | peso }}
                </span>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-muted">vs Last Month</span>
                <span class="fw-semibold" [class.text-success]="monthlyComparison().difference < 0" [class.text-danger]="monthlyComparison().difference > 0">
                  @if (monthlyComparison().difference > 0) {
                    +{{ monthlyComparison().difference | peso }}
                  } @else if (monthlyComparison().difference < 0) {
                    {{ monthlyComparison().difference | peso }}
                  } @else {
                    Same
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Spending History -->
      <div class="card shadow-sm mb-4">
        <div class="card-header bg-white">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
            <h5 class="mb-0">
              <i class="bi bi-clock-history me-2"></i>Recent Spending
            </h5>
            <div class="d-flex gap-2 align-items-center">
              @if (availableCategories().length > 0) {
                <select class="form-select form-select-sm" style="width: auto;" [ngModel]="filterCategory()" (ngModelChange)="filterCategory.set($event)">
                  <option value="all">All Categories</option>
                  @for (cat of availableCategories(); track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
              }
              <button class="btn btn-sm btn-primary" (click)="openSpendingModal()">
                <i class="bi bi-plus me-1"></i> Record
              </button>
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          @if (filteredSpendingHistory().length === 0) {
            <div class="text-center py-5 text-muted">
              <i class="bi bi-receipt fs-1 mb-2 d-block"></i>
              @if (filterCategory() === 'all') {
                <p class="mb-2">No spending recorded this month.</p>
                <button class="btn btn-primary btn-sm" (click)="openSpendingModal()">
                  <i class="bi bi-plus-circle me-1"></i> Record Your First Spending
                </button>
              } @else {
                <p class="mb-2">No spending in this category.</p>
                <button class="btn btn-outline-secondary btn-sm" (click)="filterCategory.set('all')">
                  Show All Categories
                </button>
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
                    <th class="text-center" style="width: 60px;"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of filteredSpendingHistory(); track $index) {
                    <tr>
                      <td>{{ item.date | date:'MMM d' }}</td>
                      <td>{{ item.description }}</td>
                      <td>
                        <span class="badge" [class]="getCategoryBadgeClass(item.category)">
                          {{ getCategoryLabel(item.category) }}
                        </span>
                      </td>
                      <td class="text-end fw-semibold text-danger">-{{ item.amount | peso }}</td>
                      <td class="text-center">
                        <button
                          class="btn btn-sm btn-outline-danger"
                          (click)="deleteSpending(item.id)"
                          title="Delete this entry"
                        >
                          <i class="bi bi-trash"></i>
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
      }

      <!-- ==================== STATISTICS TAB ==================== -->
      @if (activeTab() === 'statistics') {
        <div class="row g-4 mb-4">
          <!-- Monthly Comparison Card -->
          <div class="col-md-6">
            <div class="card shadow-sm h-100">
              <div class="card-header bg-white">
                <h6 class="mb-0">
                  <i class="bi bi-arrow-left-right me-2"></i>Monthly Comparison
                </h6>
              </div>
              <div class="card-body">
                <div class="row text-center">
                  <div class="col-6 border-end">
                    <small class="text-muted d-block">Last Month</small>
                    <h3 class="mb-0">{{ monthlyComparison().previous | peso }}</h3>
                  </div>
                  <div class="col-6">
                    <small class="text-muted d-block">This Month</small>
                    <h3 class="mb-0">{{ monthlyComparison().current | peso }}</h3>
                  </div>
                </div>
                <hr>
                <div class="text-center">
                  @if (monthlyComparison().difference < 0) {
                    <div class="text-success">
                      <i class="bi bi-arrow-down-circle fs-2"></i>
                      <p class="mb-0 mt-2">
                        <strong>Great!</strong> You're spending {{ Math.abs(monthlyComparison().percentChange) }}% less than last month!
                      </p>
                    </div>
                  } @else if (monthlyComparison().difference > 0) {
                    <div class="text-danger">
                      <i class="bi bi-arrow-up-circle fs-2"></i>
                      <p class="mb-0 mt-2">
                        You're spending {{ monthlyComparison().percentChange }}% more than last month.
                      </p>
                    </div>
                  } @else {
                    <div class="text-muted">
                      <i class="bi bi-dash-circle fs-2"></i>
                      <p class="mb-0 mt-2">Same spending as last month.</p>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Lifetime Savings Card -->
          <div class="col-md-6">
            <div class="card shadow-sm h-100 bg-success bg-opacity-10 border-success">
              <div class="card-header bg-success text-white">
                <h6 class="mb-0">
                  <i class="bi bi-piggy-bank me-2"></i>Total Accumulated Savings
                </h6>
              </div>
              <div class="card-body text-center">
                <h1 class="display-4 text-success mb-2">{{ totalSavings() | peso }}</h1>
                <p class="text-muted mb-0">Unspent allowance across all months</p>
                <hr>
                <div class="row text-center">
                  <div class="col-6">
                    <h4 class="text-primary mb-0">{{ savingsRate() }}%</h4>
                    <small class="text-muted">This Month's Savings Rate</small>
                  </div>
                  <div class="col-6">
                    <h4 class="text-info mb-0">{{ remainingAmount() | peso }}</h4>
                    <small class="text-muted">Left This Month</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Spending Trend Chart -->
        <div class="card shadow-sm mb-4">
          <div class="card-header bg-white">
            <h6 class="mb-0">
              <i class="bi bi-graph-up me-2"></i>6-Month Spending Trend
            </h6>
          </div>
          <div class="card-body">
            <div class="row">
              @for (item of spendingTrend(); track item.month) {
                <div class="col-2 text-center">
                  <div class="mb-2" style="height: 150px; display: flex; flex-direction: column; justify-content: flex-end;">
                    @if (item.total > 0) {
                      <div
                        class="bg-danger bg-opacity-75 rounded-top mx-auto"
                        style="width: 40px;"
                        [style.height.px]="(item.spent / maxTrendValue()) * 120"
                        title="Spent: {{ item.spent | peso }}"
                      ></div>
                      <div
                        class="bg-success bg-opacity-75 rounded-bottom mx-auto"
                        style="width: 40px;"
                        [style.height.px]="(item.saved / maxTrendValue()) * 120"
                        title="Saved: {{ item.saved | peso }}"
                      ></div>
                    } @else {
                      <div class="text-muted small">No data</div>
                    }
                  </div>
                  <small class="text-muted">{{ item.month }}</small>
                </div>
              }
            </div>
            <div class="d-flex justify-content-center gap-4 mt-3">
              <span><span class="badge bg-danger">&nbsp;</span> Spent</span>
              <span><span class="badge bg-success">&nbsp;</span> Saved</span>
            </div>
          </div>
        </div>

        <!-- Spending by Category -->
        <div class="card shadow-sm mb-4">
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
                    <div class="col-md-6 col-lg-4 mb-3">
                      <div class="d-flex justify-content-between align-items-center mb-1">
                        <span>{{ getCategoryLabel(cat.category) }}</span>
                        <span class="fw-semibold">{{ cat.amount | peso }}</span>
                      </div>
                      <div class="progress" style="height: 8px;">
                        <div
                          class="progress-bar"
                          [class]="getCategoryProgressClass(cat.category)"
                          [style.width.%]="(cat.amount / (currentAllowance()?.spent || 1)) * 100"
                        ></div>
                      </div>
                    </div>
                  }
                }
              </div>
            } @else {
              <div class="text-center text-muted py-4">
                <i class="bi bi-pie-chart fs-1 mb-2 d-block"></i>
                <p class="mb-0">No categorized spending yet. Start recording with categories!</p>
              </div>
            }
          </div>
        </div>
      }

      <!-- ==================== SAVINGS GOALS TAB ==================== -->
      @if (activeTab() === 'savings') {
        <!-- Active Savings Goals -->
        <div class="card shadow-sm mb-4">
          <div class="card-header bg-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="bi bi-bullseye me-2"></i>My Savings Goals
            </h5>
            <button class="btn btn-sm btn-success" (click)="openGoalModal()">
              <i class="bi bi-plus me-1"></i> New Goal
            </button>
          </div>
          <div class="card-body">
            @if (savingsGoals().length === 0) {
              <div class="text-center py-5 text-muted">
                <i class="bi bi-piggy-bank fs-1 mb-2 d-block"></i>
                <h5>No savings goals yet</h5>
                <p class="mb-3">Set a goal to save for something special!</p>
                <button class="btn btn-success" (click)="openGoalModal()">
                  <i class="bi bi-plus-circle me-1"></i> Create First Goal
                </button>
              </div>
            } @else {
              <div class="row g-3">
                @for (goal of savingsGoals(); track goal.id) {
                  <div class="col-md-6">
                    <div class="card h-100" [class.border-success]="goal.isCompleted" [class.bg-success]="goal.isCompleted" [class.bg-opacity-10]="goal.isCompleted">
                      <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                          <h6 class="mb-0">
                            @if (goal.isCompleted) {
                              <i class="bi bi-check-circle-fill text-success me-1"></i>
                            } @else {
                              <i class="bi bi-target text-primary me-1"></i>
                            }
                            {{ goal.name }}
                          </h6>
                          @if (!goal.isCompleted) {
                            <button class="btn btn-sm btn-outline-danger" (click)="deleteGoal(goal.id)" title="Delete">
                              <i class="bi bi-trash"></i>
                            </button>
                          }
                        </div>

                        <div class="mb-2">
                          <div class="d-flex justify-content-between mb-1">
                            <small>{{ goal.currentAmount | peso }} / {{ goal.targetAmount | peso }}</small>
                            <small>{{ getGoalProgress(goal) }}%</small>
                          </div>
                          <div class="progress" style="height: 10px;">
                            <div
                              class="progress-bar"
                              [class.bg-success]="goal.isCompleted"
                              [class.bg-primary]="!goal.isCompleted"
                              [style.width.%]="getGoalProgress(goal)"
                            ></div>
                          </div>
                        </div>

                        @if (goal.targetDate && !goal.isCompleted) {
                          <small class="text-muted">
                            <i class="bi bi-calendar me-1"></i>
                            Target: {{ goal.targetDate | date:'MMM d, y' }}
                          </small>
                        }

                        @if (goal.isCompleted) {
                          <div class="alert alert-success mb-0 mt-2 py-2">
                            <i class="bi bi-trophy me-1"></i> Goal completed! 🎉
                          </div>
                        } @else {
                          <div class="mt-2">
                            <button class="btn btn-sm btn-outline-success w-100" (click)="openAddToGoalModal(goal)">
                              <i class="bi bi-plus me-1"></i> Add Savings
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Savings Tips -->
        <div class="card bg-light border-0">
          <div class="card-body">
            <h6 class="card-title">
              <i class="bi bi-lightbulb me-2 text-warning"></i>Savings Tips
            </h6>
            <ul class="mb-0 small">
              <li>Save at least 20% of your allowance each month.</li>
              <li>Set specific goals - saving for something makes it easier!</li>
              <li>Track every expense to know where your money goes.</li>
              <li>Wait 24 hours before making non-essential purchases.</li>
              <li>Celebrate small wins when you reach savings milestones!</li>
            </ul>
          </div>
        </div>
      }

      <!-- ==================== MODALS ==================== -->

      <!-- Record Spending Modal -->
      @if (showSpendingModal()) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-cart-plus text-primary me-2"></i>Record Spending
                </h5>
                <button type="button" class="btn-close" (click)="closeSpendingModal()"></button>
              </div>
              <div class="modal-body">
                <div class="mb-3">
                  <label class="form-label">Description</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="spendingDescription"
                    placeholder="What did you spend on?"
                  />
                </div>

                <div class="mb-3">
                  <label class="form-label">Category</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="spendingCategory"
                    list="categoryList"
                    placeholder="Enter or select a category"
                  />
                  <datalist id="categoryList">
                    @for (cat of suggestedCategories; track cat) {
                      <option [value]="cat"></option>
                    }
                  </datalist>
                  <small class="text-muted">Type your own or choose from suggestions</small>
                </div>

                <div class="mb-3">
                  <label class="form-label">Amount</label>
                  <div class="input-group">
                    <span class="input-group-text">₱</span>
                    <input
                      type="number"
                      class="form-control"
                      [(ngModel)]="spendingAmount"
                      min="1"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <!-- Quick Amount Buttons -->
                <div class="mb-3">
                  <label class="form-label">Quick Amounts</label>
                  <div class="d-flex flex-wrap gap-2">
                    @for (amount of quickAmounts; track amount) {
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary"
                        (click)="spendingAmount = amount"
                      >
                        ₱{{ amount }}
                      </button>
                    }
                  </div>
                </div>

                @if (remainingAmount() < spendingAmount) {
                  <div class="alert alert-warning mb-0">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    This will exceed your remaining allowance!
                  </div>
                }
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeSpendingModal()">Cancel</button>
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="recordSpending()"
                  [disabled]="!canRecordSpending()"
                >
                  <i class="bi bi-check me-1"></i> Record
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Create Goal Modal -->
      @if (showGoalModal()) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-bullseye text-success me-2"></i>Create Savings Goal
                </h5>
                <button type="button" class="btn-close" (click)="closeGoalModal()"></button>
              </div>
              <div class="modal-body">
                <div class="mb-3">
                  <label class="form-label">What are you saving for?</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="goalName"
                    placeholder="e.g., New Phone, Birthday Gift"
                  />
                </div>

                <div class="mb-3">
                  <label class="form-label">Target Amount</label>
                  <div class="input-group">
                    <span class="input-group-text">₱</span>
                    <input
                      type="number"
                      class="form-control"
                      [(ngModel)]="goalAmount"
                      min="100"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Target Date (Optional)</label>
                  <input
                    type="date"
                    class="form-control"
                    [(ngModel)]="goalDate"
                  />
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeGoalModal()">Cancel</button>
                <button
                  type="button"
                  class="btn btn-success"
                  (click)="createGoal()"
                  [disabled]="!canCreateGoal()"
                >
                  <i class="bi bi-plus-circle me-1"></i> Create Goal
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Add to Goal Modal -->
      @if (showAddToGoalModal()) {
        <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-piggy-bank text-success me-2"></i>Add to Savings
                </h5>
                <button type="button" class="btn-close" (click)="closeAddToGoalModal()"></button>
              </div>
              <div class="modal-body">
                @if (selectedGoal()) {
                  <div class="alert alert-info mb-3">
                    <strong>{{ selectedGoal()!.name }}</strong><br>
                    <small>{{ selectedGoal()!.currentAmount | peso }} of {{ selectedGoal()!.targetAmount | peso }} saved</small>
                  </div>
                }

                <div class="mb-3">
                  <label class="form-label">Amount to Add</label>
                  <div class="input-group">
                    <span class="input-group-text">₱</span>
                    <input
                      type="number"
                      class="form-control"
                      [(ngModel)]="addToGoalAmount"
                      min="1"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <!-- Quick amounts -->
                <div class="d-flex flex-wrap gap-2">
                  @for (amount of [100, 200, 500, 1000]; track amount) {
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-success"
                      (click)="addToGoalAmount = amount"
                    >
                      ₱{{ amount }}
                    </button>
                  }
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeAddToGoalModal()">Cancel</button>
                <button
                  type="button"
                  class="btn btn-success"
                  (click)="addToGoal()"
                  [disabled]="addToGoalAmount <= 0"
                >
                  <i class="bi bi-plus me-1"></i> Add Savings
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Success Message Toast -->
      @if (successMessage()) {
        <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 1100;">
          <div class="toast show bg-success text-white">
            <div class="toast-body d-flex align-items-center">
              <i class="bi bi-check-circle me-2"></i>
              {{ successMessage() }}
              <button type="button" class="btn-close btn-close-white ms-auto" (click)="successMessage.set('')"></button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AllowanceDetailsComponent {
  private readonly authService = inject(AuthService);
  private readonly allowanceService = inject(AllowanceService);

  protected readonly Math = Math;

  // ==================== TAB STATE ====================
  protected readonly activeTab = signal<'overview' | 'statistics' | 'savings'>('overview');

  // ==================== DATE SELECTION ====================
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

  protected readonly availableYears = [2024, 2025, 2026, 2027];
  protected readonly quickAmounts = [20, 50, 100, 200, 500];

  // ==================== SUGGESTED CATEGORIES ====================
  protected readonly suggestedCategories = [
    'Food & Snacks',
    'Entertainment',
    'School Supplies',
    'Transportation',
    'Clothing',
    'Savings',
    'Gifts',
    'Other',
  ];

  // ==================== MODAL STATES ====================
  protected readonly showSpendingModal = signal(false);
  protected readonly showGoalModal = signal(false);
  protected readonly showAddToGoalModal = signal(false);
  protected readonly successMessage = signal('');
  protected readonly selectedGoal = signal<SavingsGoal | null>(null);

  // ==================== FORM FIELDS ====================
  protected spendingDescription = '';
  protected spendingCategory = '';
  protected spendingAmount = 0;
  protected goalName = '';
  protected goalAmount = 0;
  protected goalDate = '';
  protected addToGoalAmount = 0;

  // ==================== COMPUTED SIGNALS ====================
  protected readonly currentAllowance = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return null;
    return this.allowanceService.getAllowance(user.id, this.selectedMonth(), this.selectedYear()) || null;
  });

  protected readonly filterCategory = signal<string>('all');

  protected readonly spendingHistory = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return [];
    return this.allowanceService.getTransactionsForMonth(user.id, this.selectedMonth(), this.selectedYear());
  });

  // Get unique categories from spending history for filter dropdown
  protected readonly availableCategories = computed(() => {
    const history = this.spendingHistory();
    const categories = new Set<string>();
    history.forEach(item => {
      if (item.category) categories.add(item.category);
    });
    return Array.from(categories).sort();
  });

  protected readonly filteredSpendingHistory = computed(() => {
    const history = this.spendingHistory();
    const category = this.filterCategory();
    if (category === 'all') return history;
    return history.filter(item => item.category === category);
  });

  protected readonly savingsGoals = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return [];
    return this.allowanceService.getSavingsGoals(user.id);
  });

  protected readonly spendingTrend = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return [];
    return this.allowanceService.getSpendingHistory(user.id, 6);
  });

  protected readonly spendingCategories = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return [];
    const byCategory = this.allowanceService.getSpendingByCategory(user.id, this.selectedMonth(), this.selectedYear());
    return Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount
    }));
  });

  protected readonly monthlyComparison = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return { current: 0, previous: 0, difference: 0, percentChange: 0 };
    return this.allowanceService.getMonthlyComparison(user.id);
  });

  // ==================== CALCULATED VALUES ====================
  protected remainingAmount(): number {
    const allowance = this.currentAllowance();
    if (!allowance) return 0;
    return Math.max(0, allowance.monthlyAmount - allowance.spent);
  }

  protected spendingPercentage(): number {
    const allowance = this.currentAllowance();
    if (!allowance || allowance.monthlyAmount === 0) return 0;
    return Math.round((allowance.spent / allowance.monthlyAmount) * 100);
  }

  protected savingsRate(): number {
    const user = this.authService.currentUser();
    if (!user) return 0;
    return this.allowanceService.getSavingsRate(user.id, this.selectedMonth(), this.selectedYear());
  }

  protected totalSavings(): number {
    const user = this.authService.currentUser();
    if (!user) return 0;
    return this.allowanceService.getTotalSavings(user.id);
  }

  protected dailyAverage(): number {
    const allowance = this.currentAllowance();
    if (!allowance) return 0;
    const daysPassed = new Date().getDate();
    return daysPassed > 0 ? allowance.spent / daysPassed : 0;
  }

  protected daysLeftInMonth(): number {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
  }

  protected dailyBudgetLeft(): number {
    const daysLeft = this.daysLeftInMonth();
    if (daysLeft <= 0) return 0;
    return this.remainingAmount() / daysLeft;
  }

  protected maxTrendValue(): number {
    const trend = this.spendingTrend();
    return Math.max(...trend.map(t => t.total), 1);
  }

  protected hasSpendingCategories(): boolean {
    return this.spendingCategories().some(c => c.amount > 0);
  }

  protected getGoalProgress(goal: SavingsGoal): number {
    if (goal.targetAmount === 0) return 0;
    return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  }

  // ==================== CATEGORY HELPERS ====================
  protected getCategoryLabel(category: string | undefined): string {
    return category || 'Other';
  }

  protected getCategoryBadgeClass(category: string | undefined): string {
    if (!category) return 'bg-secondary';
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes('food') || lowerCat.includes('snack')) return 'bg-warning text-dark';
    if (lowerCat.includes('entertainment') || lowerCat.includes('game')) return 'bg-purple text-white';
    if (lowerCat.includes('school') || lowerCat.includes('supplies')) return 'bg-info';
    if (lowerCat.includes('transport')) return 'bg-secondary';
    if (lowerCat.includes('cloth')) return 'bg-pink';
    if (lowerCat.includes('saving')) return 'bg-success';
    if (lowerCat.includes('gift')) return 'bg-danger';
    return 'bg-primary';
  }

  protected getCategoryProgressClass(category: string): string {
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes('food') || lowerCat.includes('snack')) return 'bg-warning';
    if (lowerCat.includes('entertainment') || lowerCat.includes('game')) return 'bg-purple';
    if (lowerCat.includes('school') || lowerCat.includes('supplies')) return 'bg-info';
    if (lowerCat.includes('transport')) return 'bg-secondary';
    if (lowerCat.includes('cloth')) return 'bg-pink';
    if (lowerCat.includes('saving')) return 'bg-success';
    if (lowerCat.includes('gift')) return 'bg-danger';
    return 'bg-primary';
  }

  // ==================== SPENDING MODAL ====================
  protected openSpendingModal(): void {
    this.spendingDescription = '';
    this.spendingCategory = '';
    this.spendingAmount = 0;
    this.showSpendingModal.set(true);
  }

  protected closeSpendingModal(): void {
    this.showSpendingModal.set(false);
  }

  protected canRecordSpending(): boolean {
    return this.spendingDescription.trim() !== '' && this.spendingAmount > 0;
  }

  protected async recordSpending(): Promise<void> {
    if (!this.canRecordSpending()) return;

    const user = this.authService.currentUser();
    if (!user) return;

    await this.allowanceService.spendFromAllowanceWithCategory(
      user.id,
      this.spendingAmount,
      this.spendingDescription,
      this.spendingCategory,
      this.selectedMonth(),
      this.selectedYear()
    );

    this.successMessage.set(`₱${this.spendingAmount} recorded successfully!`);
    this.closeSpendingModal();
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  protected async deleteSpending(transactionId: string): Promise<void> {
    // Find the transaction first to check if it's a savings transaction
    const transaction = this.spendingHistory().find(t => t.id === transactionId);
    if (!transaction) return;

    // Check if this is a savings transaction
    const isSavingsTransaction = transaction.category === 'Savings' && transaction.description.startsWith('Savings: ');

    const confirmMessage = isSavingsTransaction
      ? 'Are you sure you want to delete this savings entry? The amount will be restored to your allowance and deducted from the savings goal.'
      : 'Are you sure you want to delete this spending entry? The amount will be restored to your allowance.';

    if (!confirm(confirmMessage)) {
      return;
    }

    // If it's a savings transaction, deduct from the savings goal
    if (isSavingsTransaction) {
      const goalName = transaction.description.replace('Savings: ', '');
      const user = this.authService.currentUser();
      if (user) {
        await this.allowanceService.deductFromSavingsGoal(goalName, user.id, transaction.amount);
      }
    }

    const success = await this.allowanceService.deleteTransaction(transactionId);
    if (success) {
      this.successMessage.set('Spending entry deleted successfully!');
      setTimeout(() => this.successMessage.set(''), 3000);
    }
  }

  // ==================== GOAL MODAL ====================
  protected openGoalModal(): void {
    this.goalName = '';
    this.goalAmount = 0;
    this.goalDate = '';
    this.showGoalModal.set(true);
  }

  protected closeGoalModal(): void {
    this.showGoalModal.set(false);
  }

  protected canCreateGoal(): boolean {
    return this.goalName.trim() !== '' && this.goalAmount >= 100;
  }

  protected async createGoal(): Promise<void> {
    if (!this.canCreateGoal()) return;

    const user = this.authService.currentUser();
    if (!user) return;

    const targetDate = this.goalDate ? new Date(this.goalDate) : undefined;

    await this.allowanceService.createSavingsGoal(
      user.id,
      this.goalName.trim(),
      this.goalAmount,
      targetDate
    );

    this.successMessage.set('Savings goal created!');
    this.closeGoalModal();
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  // ==================== ADD TO GOAL MODAL ====================
  protected openAddToGoalModal(goal: SavingsGoal): void {
    this.selectedGoal.set(goal);
    this.addToGoalAmount = 0;
    this.showAddToGoalModal.set(true);
  }

  protected closeAddToGoalModal(): void {
    this.showAddToGoalModal.set(false);
    this.selectedGoal.set(null);
  }

  protected async addToGoal(): Promise<void> {
    const goal = this.selectedGoal();
    if (!goal || this.addToGoalAmount <= 0) return;

    const user = this.authService.currentUser();
    if (!user) return;

    // Check if user has enough remaining allowance
    const remaining = this.remainingAmount();
    if (this.addToGoalAmount > remaining) {
      alert(`You only have ₱${remaining.toFixed(2)} remaining in your allowance.`);
      return;
    }

    // Deduct from allowance as "Savings" spending
    const spendingSuccess = await this.allowanceService.spendFromAllowanceWithCategory(
      user.id,
      this.addToGoalAmount,
      `Savings: ${goal.name}`,
      'Savings',
      this.selectedMonth(),
      this.selectedYear()
    );

    if (!spendingSuccess) {
      alert('Failed to deduct from allowance. Please try again.');
      return;
    }

    // Add to savings goal
    await this.allowanceService.addToSavingsGoal(goal.id, this.addToGoalAmount);

    const goalRemaining = goal.targetAmount - goal.currentAmount - this.addToGoalAmount;
    if (goalRemaining <= 0) {
      this.successMessage.set(`🎉 Congratulations! You've reached your goal!`);
    } else {
      this.successMessage.set(`₱${this.addToGoalAmount} added to ${goal.name}!`);
    }

    this.closeAddToGoalModal();
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  protected async deleteGoal(goalId: string): Promise<void> {
    if (confirm('Are you sure you want to delete this savings goal?')) {
      await this.allowanceService.deleteSavingsGoal(goalId);
      this.successMessage.set('Savings goal deleted.');
      setTimeout(() => this.successMessage.set(''), 3000);
    }
  }
}
