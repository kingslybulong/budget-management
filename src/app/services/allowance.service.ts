import { Injectable, signal, computed, inject, effect, Injector } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getDocs,
} from '@angular/fire/firestore';
import { Allowance, AllowanceTransaction, SavingsGoal, BudgetCategoryType } from '../models';
import { AuthService } from './auth.service';
import { BudgetService } from './budget.service';

/**
 * Allowance management service with Firestore persistence
 * Handles monthly allowances for users and tracks spending
 */
@Injectable({
  providedIn: 'root',
})
export class AllowanceService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly injector = inject(Injector);
  private budgetService?: BudgetService;

  /** Lazy inject BudgetService to avoid circular dependency */
  private getBudgetService(): BudgetService {
    if (!this.budgetService) {
      this.budgetService = this.injector.get(BudgetService);
    }
    return this.budgetService;
  }

  private readonly allowancesSignal = signal<Allowance[]>([]);
  private readonly transactionsSignal = signal<AllowanceTransaction[]>([]);
  private readonly savingsGoalsSignal = signal<SavingsGoal[]>([]);
  private readonly loadingSignal = signal<boolean>(true);
  private unsubscribeAllowances?: () => void;
  private unsubscribeTransactions?: () => void;
  private unsubscribeSavingsGoals?: () => void;

  /** All allowances */
  readonly allowances = this.allowancesSignal.asReadonly();

  /** All transactions */
  readonly transactions = this.transactionsSignal.asReadonly();

  /** All savings goals */
  readonly savingsGoals = this.savingsGoalsSignal.asReadonly();

  /** Loading state */
  readonly loading = this.loadingSignal.asReadonly();

  /** Current month's allowances */
  readonly currentMonthAllowances = computed(() => {
    const now = new Date();
    return this.allowancesSignal().filter(
      (a) => a.month === now.getMonth() + 1 && a.year === now.getFullYear()
    );
  });

  /** Total allowances for current month */
  readonly totalCurrentAllowances = computed(() =>
    this.currentMonthAllowances().reduce((sum, a) => sum + a.monthlyAmount, 0)
  );

  /** Total spent from allowances this month */
  readonly totalSpentAllowances = computed(() =>
    this.currentMonthAllowances().reduce((sum, a) => sum + a.spent, 0)
  );

  constructor() {
    // Subscribe to allowances when authenticated
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth) {
        this.subscribeToAllowances();
        this.subscribeToTransactions();
        this.subscribeToSavingsGoals();
      } else {
        this.unsubscribeAllowances?.();
        this.unsubscribeTransactions?.();
        this.unsubscribeSavingsGoals?.();
        this.allowancesSignal.set([]);
        this.transactionsSignal.set([]);
        this.savingsGoalsSignal.set([]);
      }
    });
  }

  /**
   * Subscribe to real-time allowance updates from Firestore
   */
  private subscribeToAllowances(): void {
    this.loadingSignal.set(true);
    const allowancesCollection = collection(this.firestore, 'allowances');
    // Simple query without composite index requirement - sort client-side
    const q = query(allowancesCollection);

    this.unsubscribeAllowances = onSnapshot(q, (snapshot) => {
      const allowances = snapshot.docs
        .map((doc) => this.convertDocToAllowance(doc))
        // Sort client-side: by year desc, then month desc
        .sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return b.month - a.month;
        });
      this.allowancesSignal.set(allowances);
      this.loadingSignal.set(false);
    }, (error) => {
      console.error('Error subscribing to allowances:', error);
      this.loadingSignal.set(false);
    });
  }

  /**
   * Subscribe to real-time transaction updates
   */
  private subscribeToTransactions(): void {
    const transactionsCollection = collection(this.firestore, 'allowanceTransactions');
    const q = query(transactionsCollection, orderBy('createdAt', 'desc'));

    this.unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map((doc) => this.convertDocToTransaction(doc));
      this.transactionsSignal.set(transactions);
    });
  }

  /**
   * Subscribe to real-time savings goals updates
   */
  private subscribeToSavingsGoals(): void {
    const goalsCollection = collection(this.firestore, 'savingsGoals');
    const q = query(goalsCollection, orderBy('createdAt', 'desc'));

    this.unsubscribeSavingsGoals = onSnapshot(q, (snapshot) => {
      const goals = snapshot.docs.map((doc) => this.convertDocToSavingsGoal(doc));
      this.savingsGoalsSignal.set(goals);
    });
  }

  /**
   * Convert Firestore document to Allowance
   */
  private convertDocToAllowance(doc: any): Allowance {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data['userId'],
      userName: data['userName'],
      monthlyAmount: data['monthlyAmount'] ?? 0,
      spent: data['spent'] ?? 0,
      month: data['month'],
      year: data['year'],
      createdAt: data['createdAt']?.toDate() ?? new Date(),
      updatedAt: data['updatedAt']?.toDate() ?? new Date(),
    };
  }

  /**
   * Convert Firestore document to AllowanceTransaction
   */
  private convertDocToTransaction(doc: any): AllowanceTransaction {
    const data = doc.data();
    return {
      id: doc.id,
      allowanceId: data['allowanceId'],
      userId: data['userId'],
      amount: data['amount'],
      description: data['description'],
      category: data['category'] as string,
      date: data['date']?.toDate() ?? new Date(),
      createdAt: data['createdAt']?.toDate() ?? new Date(),
    };
  }

  /**
   * Convert Firestore document to SavingsGoal
   */
  private convertDocToSavingsGoal(doc: any): SavingsGoal {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data['userId'],
      name: data['name'],
      targetAmount: data['targetAmount'],
      currentAmount: data['currentAmount'] ?? 0,
      targetDate: data['targetDate']?.toDate(),
      isCompleted: data['isCompleted'] ?? false,
      createdAt: data['createdAt']?.toDate() ?? new Date(),
      updatedAt: data['updatedAt']?.toDate() ?? new Date(),
    };
  }

  /**
   * Get allowance for a specific user and month
   */
  getAllowanceForUser(userId: string, month?: number, year?: number): Allowance | undefined {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    return this.allowancesSignal().find(
      (a) => a.userId === userId && a.month === targetMonth && a.year === targetYear
    );
  }

  /**
   * Alias for getAllowanceForUser
   */
  getAllowance(userId: string, month?: number, year?: number): Allowance | undefined {
    return this.getAllowanceForUser(userId, month, year);
  }

  /**
   * Record spending from allowance
   */
  async recordSpending(userId: string, month: number, year: number, amount: number): Promise<boolean> {
    const allowance = this.getAllowanceForUser(userId, month, year);
    if (!allowance) return false;

    try {
      const allowanceRef = doc(this.firestore, 'allowances', allowance.id);
      await updateDoc(allowanceRef, {
        spent: allowance.spent + amount,
        updatedAt: Timestamp.now(),
      });
      return true;
    } catch (error) {
      console.error('Error recording spending:', error);
      return false;
    }
  }

  /**
   * Get all allowances for a user (all months)
   */
  getAllAllowancesForUser(userId: string): Allowance[] {
    return this.allowancesSignal().filter((a) => a.userId === userId);
  }

  /**
   * Get transactions for a specific allowance
   */
  getTransactionsForAllowance(allowanceId: string): AllowanceTransaction[] {
    return this.transactionsSignal().filter((t) => t.allowanceId === allowanceId);
  }

  /**
   * Set monthly allowance for a user (Admin only)
   * This also deducts from the budget's Allowances category
   * Queries Firestore directly to avoid race conditions with duplicates
   */
  async setAllowance(
    userId: string,
    userName: string,
    monthlyAmount: number,
    month?: number,
    year?: number
  ): Promise<Allowance | null> {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    try {
      // Query Firestore directly to find existing allowance (avoids signal timing issues)
      const allowancesRef = collection(this.firestore, 'allowances');
      const q = query(
        allowancesRef,
        where('userId', '==', userId),
        where('month', '==', targetMonth),
        where('year', '==', targetYear)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Update the first matching allowance (there should only be one)
        const existingDoc = snapshot.docs[0];
        const existingData = existingDoc.data();
        const existingAmount = existingData['monthlyAmount'] ?? 0;
        const difference = monthlyAmount - existingAmount;

        // Update existing allowance
        const allowanceRef = doc(this.firestore, 'allowances', existingDoc.id);
        await updateDoc(allowanceRef, {
          monthlyAmount,
          updatedAt: Timestamp.now(),
        });

        // Adjust budget's Allowances category by the difference
        if (difference !== 0) {
          await this.getBudgetService().addExpenseToCategory(
            targetMonth,
            targetYear,
            BudgetCategoryType.ALLOWANCES,
            difference
          );
        }

        return {
          id: existingDoc.id,
          userId: existingData['userId'],
          userName: existingData['userName'],
          monthlyAmount,
          spent: existingData['spent'] ?? 0,
          month: targetMonth,
          year: targetYear,
          createdAt: existingData['createdAt']?.toDate() ?? new Date(),
          updatedAt: new Date(),
        };
      } else {
        // Create new allowance
        const newAllowance = {
          userId,
          userName,
          monthlyAmount,
          spent: 0,
          month: targetMonth,
          year: targetYear,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(this.firestore, 'allowances'), newAllowance);

        // Deduct from budget's Allowances category
        await this.getBudgetService().addExpenseToCategory(
          targetMonth,
          targetYear,
          BudgetCategoryType.ALLOWANCES,
          monthlyAmount
        );

        return {
          ...newAllowance,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    } catch (error) {
      console.error('Error in setAllowance:', error);
      return null;
    }
  }

  /**
   * Spend from allowance (User action)
   * Returns false if insufficient funds
   */
  async spendFromAllowance(
    userId: string,
    amount: number,
    description: string,
    month?: number,
    year?: number
  ): Promise<boolean> {
    const allowance = this.getAllowanceForUser(userId, month, year);
    if (!allowance) return false;

    const remaining = allowance.monthlyAmount - allowance.spent;
    if (amount > remaining) return false;

    try {
      // Update allowance spent amount
      const allowanceRef = doc(this.firestore, 'allowances', allowance.id);
      await updateDoc(allowanceRef, {
        spent: allowance.spent + amount,
        updatedAt: Timestamp.now(),
      });

      // Record transaction
      await addDoc(collection(this.firestore, 'allowanceTransactions'), {
        allowanceId: allowance.id,
        userId,
        amount,
        description,
        date: Timestamp.now(),
        createdAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error('Error spending from allowance:', error);
      return false;
    }
  }

  /**
   * Get remaining allowance for a user
   */
  getRemainingAllowance(userId: string, month?: number, year?: number): number {
    const allowance = this.getAllowanceForUser(userId, month, year);
    if (!allowance) return 0;
    return allowance.monthlyAmount - allowance.spent;
  }

  /**
   * Check if user can spend amount from allowance
   */
  canSpend(userId: string, amount: number, month?: number, year?: number): boolean {
    return this.getRemainingAllowance(userId, month, year) >= amount;
  }

  // ==================== STATISTICS METHODS ====================

  /**
   * Get total accumulated savings for a user (sum of unspent allowance across all months)
   */
  getTotalSavings(userId: string): number {
    return this.allowancesSignal()
      .filter(a => a.userId === userId)
      .reduce((sum, a) => sum + Math.max(0, a.monthlyAmount - a.spent), 0);
  }

  /**
   * Get savings rate for a specific month (percentage of allowance not spent)
   */
  getSavingsRate(userId: string, month?: number, year?: number): number {
    const allowance = this.getAllowanceForUser(userId, month, year);
    if (!allowance || allowance.monthlyAmount === 0) return 0;
    const saved = Math.max(0, allowance.monthlyAmount - allowance.spent);
    return Math.round((saved / allowance.monthlyAmount) * 100);
  }

  /**
   * Get spending history for the last N months
   */
  getSpendingHistory(userId: string, months: number = 6): { month: string; spent: number; saved: number; total: number }[] {
    const now = new Date();
    const history: { month: string; spent: number; saved: number; total: number }[] = [];

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const allowance = this.getAllowanceForUser(userId, month, year);

      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      history.push({
        month: monthName,
        spent: allowance?.spent ?? 0,
        saved: allowance ? Math.max(0, allowance.monthlyAmount - allowance.spent) : 0,
        total: allowance?.monthlyAmount ?? 0
      });
    }

    return history.reverse();
  }

  /**
   * Get spending by category for a user
   */
  getSpendingByCategory(userId: string, month?: number, year?: number): Record<string, number> {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const allowance = this.getAllowanceForUser(userId, targetMonth, targetYear);
    if (!allowance) {
      return {};
    }

    const transactions = this.transactionsSignal().filter(t => t.allowanceId === allowance.id);

    const result: Record<string, number> = {};

    transactions.forEach(t => {
      const category = t.category || 'Other';
      result[category] = (result[category] || 0) + t.amount;
    });

    return result;
  }

  /**
   * Get comparison with previous month
   */
  getMonthlyComparison(userId: string): { current: number; previous: number; difference: number; percentChange: number } {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevDate.getMonth() + 1;
    const prevYear = prevDate.getFullYear();

    const currentAllowance = this.getAllowanceForUser(userId, currentMonth, currentYear);
    const prevAllowance = this.getAllowanceForUser(userId, prevMonth, prevYear);

    const current = currentAllowance?.spent ?? 0;
    const previous = prevAllowance?.spent ?? 0;
    const difference = current - previous;
    const percentChange = previous > 0 ? Math.round((difference / previous) * 100) : 0;

    return { current, previous, difference, percentChange };
  }

  /**
   * Get user's transactions for a specific month
   */
  getTransactionsForMonth(userId: string, month?: number, year?: number): AllowanceTransaction[] {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const allowance = this.getAllowanceForUser(userId, targetMonth, targetYear);
    if (!allowance) return [];

    return this.transactionsSignal().filter(t => t.allowanceId === allowance.id);
  }

  // ==================== SAVINGS GOALS METHODS ====================

  /**
   * Get savings goals for a user
   */
  getSavingsGoals(userId: string): SavingsGoal[] {
    return this.savingsGoalsSignal().filter(g => g.userId === userId);
  }

  /**
   * Create a new savings goal
   */
  async createSavingsGoal(
    userId: string,
    name: string,
    targetAmount: number,
    targetDate?: Date
  ): Promise<SavingsGoal | null> {
    try {
      const goal: Record<string, any> = {
        userId,
        name,
        targetAmount,
        currentAmount: 0,
        isCompleted: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (targetDate) {
        goal['targetDate'] = Timestamp.fromDate(targetDate);
      }

      const docRef = await addDoc(collection(this.firestore, 'savingsGoals'), goal);
      return {
        id: docRef.id,
        userId,
        name,
        targetAmount,
        currentAmount: 0,
        targetDate,
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating savings goal:', error);
      return null;
    }
  }

  /**
   * Add to savings goal
   */
  async addToSavingsGoal(goalId: string, amount: number): Promise<boolean> {
    try {
      const goal = this.savingsGoalsSignal().find(g => g.id === goalId);
      if (!goal) return false;

      const newAmount = goal.currentAmount + amount;
      const isCompleted = newAmount >= goal.targetAmount;

      const goalRef = doc(this.firestore, 'savingsGoals', goalId);
      await updateDoc(goalRef, {
        currentAmount: newAmount,
        isCompleted,
        updatedAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error('Error adding to savings goal:', error);
      return false;
    }
  }

  /**
   * Deduct from savings goal (when deleting a savings transaction)
   */
  async deductFromSavingsGoal(goalName: string, userId: string, amount: number): Promise<boolean> {
    try {
      // Find the goal by name for this user
      const goal = this.savingsGoalsSignal().find(g => g.userId === userId && g.name === goalName);
      if (!goal) return false;

      const newAmount = Math.max(0, goal.currentAmount - amount);
      const isCompleted = newAmount >= goal.targetAmount;

      const goalRef = doc(this.firestore, 'savingsGoals', goal.id);
      await updateDoc(goalRef, {
        currentAmount: newAmount,
        isCompleted,
        updatedAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error('Error deducting from savings goal:', error);
      return false;
    }
  }

  /**
   * Delete a savings goal
   */
  async deleteSavingsGoal(goalId: string): Promise<boolean> {
    try {
      const { deleteDoc } = await import('@angular/fire/firestore');
      await deleteDoc(doc(this.firestore, 'savingsGoals', goalId));
      return true;
    } catch (error) {
      console.error('Error deleting savings goal:', error);
      return false;
    }
  }

  /**
   * Spend from allowance with category (enhanced version)
   */
  async spendFromAllowanceWithCategory(
    userId: string,
    amount: number,
    description: string,
    category: string,
    month?: number,
    year?: number
  ): Promise<boolean> {
    const allowance = this.getAllowanceForUser(userId, month, year);
    if (!allowance) return false;

    const remaining = allowance.monthlyAmount - allowance.spent;
    if (amount > remaining) return false;

    try {
      // Update allowance spent amount
      const allowanceRef = doc(this.firestore, 'allowances', allowance.id);
      await updateDoc(allowanceRef, {
        spent: allowance.spent + amount,
        updatedAt: Timestamp.now(),
      });

      // Record transaction with category
      await addDoc(collection(this.firestore, 'allowanceTransactions'), {
        allowanceId: allowance.id,
        userId,
        amount,
        description,
        category,
        date: Timestamp.now(),
        createdAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error('Error spending from allowance:', error);
      return false;
    }
  }

  /**
   * Delete a spending transaction and restore the amount to allowance
   */
  async deleteTransaction(transactionId: string): Promise<boolean> {
    try {
      // Find the transaction
      const transaction = this.transactionsSignal().find(t => t.id === transactionId);
      if (!transaction) return false;

      // Find the allowance to restore the amount
      const allowance = this.allowancesSignal().find(a => a.id === transaction.allowanceId);
      if (allowance) {
        // Restore the spent amount
        const allowanceRef = doc(this.firestore, 'allowances', allowance.id);
        await updateDoc(allowanceRef, {
          spent: Math.max(0, allowance.spent - transaction.amount),
          updatedAt: Timestamp.now(),
        });
      }

      // Delete the transaction
      const { deleteDoc } = await import('@angular/fire/firestore');
      await deleteDoc(doc(this.firestore, 'allowanceTransactions', transactionId));

      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  }
}
