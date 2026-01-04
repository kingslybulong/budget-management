import { Injectable, signal, computed, inject, effect } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getDocs,
  setDoc,
} from '@angular/fire/firestore';
import { BudgetCategory, BudgetCategoryType, MonthlyBudget } from '../models';
import { AuthService } from './auth.service';

/**
 * Create default budget categories for a month
 */
function createDefaultCategories(month: number, year: number): Omit<BudgetCategory, 'id'>[] {
  return [
    {
      type: BudgetCategoryType.FOOD,
      name: 'Food & Groceries',
      monthlyLimit: 15000,
      spent: 0,
      warningThreshold: 0.8,
      month,
      year,
      icon: 'bi-cart',
      color: 'success',
    },
    {
      type: BudgetCategoryType.UTILITIES,
      name: 'Utilities',
      monthlyLimit: 5000,
      spent: 0,
      warningThreshold: 0.8,
      month,
      year,
      icon: 'bi-lightning',
      color: 'warning',
    },
    {
      type: BudgetCategoryType.SCHOOL,
      name: 'School & Education',
      monthlyLimit: 10000,
      spent: 0,
      warningThreshold: 0.8,
      month,
      year,
      icon: 'bi-book',
      color: 'info',
    },
    {
      type: BudgetCategoryType.ALLOWANCES,
      name: 'Allowances',
      monthlyLimit: 6000,
      spent: 0,
      warningThreshold: 0.8,
      month,
      year,
      icon: 'bi-wallet2',
      color: 'primary',
    },
    {
      type: BudgetCategoryType.SAVINGS,
      name: 'Savings',
      monthlyLimit: 8000,
      spent: 0,
      warningThreshold: 0.9,
      month,
      year,
      icon: 'bi-piggy-bank',
      color: 'secondary',
    },
    {
      type: BudgetCategoryType.EMERGENCY,
      name: 'Emergency Fund',
      monthlyLimit: 3000,
      spent: 0,
      warningThreshold: 0.9,
      month,
      year,
      icon: 'bi-shield-exclamation',
      color: 'danger',
    },
  ];
}

/**
 * Budget management service with Firestore persistence
 * Handles monthly budget amounts, budget categories, and spending limits
 */
@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  private readonly budgetsSignal = signal<MonthlyBudget[]>([]);
  private readonly loadingSignal = signal<boolean>(true);
  private unsubscribe?: () => void;

  /** All monthly budgets */
  readonly budgets = this.budgetsSignal.asReadonly();

  /** Loading state */
  readonly loading = this.loadingSignal.asReadonly();

  /** Current month's budget */
  readonly currentBudget = computed(() => {
    const now = new Date();
    return this.getBudgetForMonth(now.getMonth() + 1, now.getFullYear());
  });

  /** Total budget for current month */
  readonly currentBudgetAmount = computed(() => this.currentBudget()?.totalBudget ?? 0);

  /** Total spent for current month */
  readonly currentSpent = computed(() => {
    const budget = this.currentBudget();
    if (!budget) return 0;
    return budget.categories.reduce((sum, cat) => sum + cat.spent, 0);
  });

  /** Remaining budget for current month */
  readonly currentRemaining = computed(() => this.currentBudgetAmount() - this.currentSpent());

  /** Categories that are over warning threshold */
  readonly warningCategories = computed(() => {
    const budget = this.currentBudget();
    if (!budget) return [];
    return budget.categories.filter((cat) => {
      // Skip categories with no allocated budget
      if (cat.monthlyLimit <= 0) return false;
      const usage = cat.spent / cat.monthlyLimit;
      return usage >= cat.warningThreshold && usage < 1;
    });
  });

  /** Categories that are over budget */
  readonly overBudgetCategories = computed(() => {
    const budget = this.currentBudget();
    if (!budget) return [];
    // Only flag as over budget if there's an allocated amount and spending exceeds it
    return budget.categories.filter((cat) => cat.monthlyLimit > 0 && cat.spent > cat.monthlyLimit);
  });

  constructor() {
    // Subscribe to budgets when authenticated
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth) {
        this.subscribeToBudgets();
      } else {
        this.unsubscribe?.();
        this.budgetsSignal.set([]);
      }
    });
  }

  /**
   * Subscribe to real-time budget updates from Firestore
   */
  private subscribeToBudgets(): void {
    this.loadingSignal.set(true);
    const budgetsCollection = collection(this.firestore, 'budgets');

    // Simplified query - no ordering to avoid index requirement
    this.unsubscribe = onSnapshot(budgetsCollection, (snapshot) => {
      console.log('Budgets snapshot received:', snapshot.docs.length, 'documents');
      const budgets = snapshot.docs.map((doc) => this.convertDocToBudget(doc));
      // Sort in memory instead
      budgets.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });
      console.log('Parsed budgets:', budgets);
      this.budgetsSignal.set(budgets);
      this.loadingSignal.set(false);
    }, (error) => {
      console.error('Error subscribing to budgets:', error);
      this.loadingSignal.set(false);
    });
  }

  /**
   * Convert Firestore document to MonthlyBudget
   */
  private convertDocToBudget(doc: any): MonthlyBudget {
    const data = doc.data();
    return {
      id: doc.id,
      month: data['month'],
      year: data['year'],
      totalBudget: data['totalBudget'] ?? data['totalIncome'] ?? 0,
      categories: (data['categories'] ?? []).map((cat: any, index: number) => ({
        ...cat,
        id: cat.id ?? `cat-${index}`,
      })),
      createdAt: data['createdAt']?.toDate() ?? new Date(),
      updatedAt: data['updatedAt']?.toDate() ?? new Date(),
    };
  }

  /**
   * Get budget for a specific month
   */
  getBudgetForMonth(month: number, year: number): MonthlyBudget | undefined {
    return this.budgetsSignal().find((b) => b.month === month && b.year === year);
  }

  /**
   * Alias for getBudgetForMonth
   */
  getBudget(month: number, year: number): MonthlyBudget | undefined {
    return this.getBudgetForMonth(month, year);
  }

  /**
   * Get yearly budget total
   */
  getYearlyBudget(year: number): number {
    return this.budgetsSignal()
      .filter((b) => b.year === year)
      .reduce((sum, b) => sum + b.totalBudget, 0);
  }

  /**
   * Get yearly spending total
   */
  getYearlySpending(year: number): number {
    return this.budgetsSignal()
      .filter((b) => b.year === year)
      .reduce((sum, b) => sum + b.categories.reduce((catSum, cat) => catSum + cat.spent, 0), 0);
  }

  /**
   * Create or update monthly budget (Admin only)
   */
  async setMonthlyBudget(month: number, year: number, totalBudget: number): Promise<MonthlyBudget | null> {
    try {
      console.log('setMonthlyBudget called:', { month, year, totalBudget });
      const existing = this.getBudgetForMonth(month, year);
      console.log('Existing budget:', existing);

      if (existing) {
        // Update existing budget
        console.log('Updating existing budget:', existing.id);
        const budgetRef = doc(this.firestore, 'budgets', existing.id);
        await updateDoc(budgetRef, {
          totalBudget,
          updatedAt: Timestamp.now(),
        });
        console.log('Budget updated successfully');
        return { ...existing, totalBudget };
      } else {
        // Create new budget
        console.log('Creating new budget');
        const defaultCategories = createDefaultCategories(month, year).map((cat, i) => ({
          ...cat,
          id: `cat-${i}-${Date.now()}`,
        }));

        const newBudget = {
          month,
          year,
          totalBudget,
          categories: defaultCategories,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(this.firestore, 'budgets'), newBudget);
        console.log('New budget created with ID:', docRef.id);
        return {
          ...newBudget,
          id: docRef.id,
          categories: defaultCategories as BudgetCategory[],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    } catch (error) {
      console.error('Error setting monthly budget:', error);
      return null;
    }
  }

  /**
   * Update a budget category limit (Admin only)
   */
  async updateCategoryLimit(
    month: number,
    year: number,
    categoryType: BudgetCategoryType,
    newLimit: number
  ): Promise<boolean> {
    try {
      const budget = this.getBudgetForMonth(month, year);
      if (!budget) return false;

      const updatedCategories = budget.categories.map((cat) =>
        cat.type === categoryType ? { ...cat, monthlyLimit: newLimit } : cat
      );

      const budgetRef = doc(this.firestore, 'budgets', budget.id);
      await updateDoc(budgetRef, {
        categories: updatedCategories,
        updatedAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error('Error updating category limit:', error);
      return false;
    }
  }

  /**
   * Add expense to a category
   */
  /**
   * Add expense to a category
   * For custom categories (type=OTHER), uses categoryId to match
   */
  async addExpenseToCategory(
    month: number,
    year: number,
    categoryType: BudgetCategoryType,
    amount: number,
    categoryId?: string
  ): Promise<boolean> {
    try {
      console.log('addExpenseToCategory called:', { month, year, categoryType, amount, categoryId });
      let budget = this.getBudgetForMonth(month, year);

      // If no budget exists for this month, create one
      if (!budget) {
        console.log('No budget found for month, creating one...');
        await this.setMonthlyBudget(month, year, 0);
        // Wait a moment for Firestore to sync
        await new Promise(resolve => setTimeout(resolve, 500));
        budget = this.getBudgetForMonth(month, year);
        if (!budget) {
          console.error('Failed to create budget for month:', { month, year });
          return false;
        }
      }

      console.log('Budget found:', budget.id, 'Categories:', budget.categories.map(c => ({ id: c.id, type: c.type, name: c.name, spent: c.spent })));

      // For custom categories (OTHER type), match by ID; otherwise match by type
      const updatedCategories = budget.categories.map((cat) => {
        // If categoryId is provided, match by ID first
        if (categoryId && cat.id === categoryId) {
          return { ...cat, spent: cat.spent + amount };
        }
        // Otherwise match by type (for standard categories)
        if (!categoryId && cat.type === categoryType) {
          return { ...cat, spent: cat.spent + amount };
        }
        return cat;
      });

      const budgetRef = doc(this.firestore, 'budgets', budget.id);
      await updateDoc(budgetRef, {
        categories: updatedCategories,
        updatedAt: Timestamp.now(),
      });

      console.log('Budget updated successfully with new spent amount');
      return true;
    } catch (error) {
      console.error('Error adding expense to category:', error);
      return false;
    }
  }

  /**
   * Remove expense from a category (when expense is deleted)
   * For custom categories (type=OTHER), uses categoryId to match
   */
  async removeExpenseFromCategory(
    month: number,
    year: number,
    categoryType: BudgetCategoryType,
    amount: number,
    categoryId?: string
  ): Promise<boolean> {
    try {
      console.log('removeExpenseFromCategory called:', { month, year, categoryType, amount, categoryId });
      const budget = this.getBudgetForMonth(month, year);

      if (!budget) {
        console.error('No budget found for month:', { month, year });
        return false;
      }

      // For custom categories (OTHER type), match by ID; otherwise match by type
      const updatedCategories = budget.categories.map((cat) => {
        // If categoryId is provided, match by ID first
        if (categoryId && cat.id === categoryId) {
          return { ...cat, spent: Math.max(0, cat.spent - amount) };
        }
        // Otherwise match by type (for standard categories)
        if (!categoryId && cat.type === categoryType) {
          return { ...cat, spent: Math.max(0, cat.spent - amount) };
        }
        return cat;
      });

      const budgetRef = doc(this.firestore, 'budgets', budget.id);
      await updateDoc(budgetRef, {
        categories: updatedCategories,
        updatedAt: Timestamp.now(),
      });

      console.log('Budget updated - expense removed from category');
      return true;
    } catch (error) {
      console.error('Error removing expense from category:', error);
      return false;
    }
  }

  /**
   * Add a new custom category to a budget
   */
  async addCategory(
    month: number,
    year: number,
    name: string,
    monthlyLimit: number,
    icon: string = 'bi-folder',
    color: string = 'primary'
  ): Promise<boolean> {
    try {
      const budget = this.getBudgetForMonth(month, year);
      if (!budget) {
        // Create budget first
        await this.setMonthlyBudget(month, year, 0);
        return this.addCategory(month, year, name, monthlyLimit, icon, color);
      }

      const newCategory: BudgetCategory = {
        id: `cat-custom-${Date.now()}`,
        type: BudgetCategoryType.OTHER,
        name,
        monthlyLimit,
        spent: 0,
        warningThreshold: 0.8,
        month,
        year,
        icon,
        color,
      };

      const updatedCategories = [...budget.categories, newCategory];

      const budgetRef = doc(this.firestore, 'budgets', budget.id);
      await updateDoc(budgetRef, {
        categories: updatedCategories,
        updatedAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error('Error adding category:', error);
      return false;
    }
  }

  /**
   * Delete a category from a budget
   */
  async deleteCategory(month: number, year: number, categoryId: string): Promise<boolean> {
    try {
      const budget = this.getBudgetForMonth(month, year);
      if (!budget) return false;

      const updatedCategories = budget.categories.filter((cat) => cat.id !== categoryId);

      const budgetRef = doc(this.firestore, 'budgets', budget.id);
      await updateDoc(budgetRef, {
        categories: updatedCategories,
        updatedAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  /**
   * Get spending history for charts (last N months)
   */
  getSpendingHistory(months: number = 6): { month: string; amount: number; spent?: number; limit?: number }[] {
    const history: { month: string; amount: number; spent?: number; limit?: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const budget = this.getBudgetForMonth(month, year);

      const monthName = date.toLocaleString('default', { month: 'short' });
      const spent = budget ? budget.categories.reduce((sum, cat) => sum + cat.spent, 0) : 0;
      history.push({
        month: monthName,
        amount: spent,
        spent: spent,
        limit: budget?.totalBudget ?? 0,
      });
    }

    return history;
  }

  /**
   * Get spending history for a custom date range
   */
  getSpendingHistoryRange(
    fromMonth: number,
    fromYear: number,
    toMonth: number,
    toYear: number
  ): { month: string; amount: number; spent?: number; limit?: number }[] {
    const history: { month: string; amount: number; spent?: number; limit?: number }[] = [];

    let currentMonth = fromMonth;
    let currentYear = fromYear;

    while (
      currentYear < toYear ||
      (currentYear === toYear && currentMonth <= toMonth)
    ) {
      const date = new Date(currentYear, currentMonth - 1, 1);
      const budget = this.getBudgetForMonth(currentMonth, currentYear);

      const monthName = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      const spent = budget ? budget.categories.reduce((sum, cat) => sum + cat.spent, 0) : 0;
      history.push({
        month: monthName,
        amount: spent,
        spent: spent,
        limit: budget?.totalBudget ?? 0,
      });

      // Move to next month
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    return history;
  }

  /**
   * Initialize default budget for current month if none exists
   */
  async initializeCurrentMonthBudget(totalBudget: number = 50000): Promise<void> {
    const now = new Date();
    const existing = this.getBudgetForMonth(now.getMonth() + 1, now.getFullYear());
    if (!existing) {
      await this.setMonthlyBudget(now.getMonth() + 1, now.getFullYear(), totalBudget);
    }
  }
}
