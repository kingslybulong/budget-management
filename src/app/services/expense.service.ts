import { Injectable, signal, computed, inject, effect, Injector } from '@angular/core';
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
} from '@angular/fire/firestore';
import { Expense, ExpenseStatus, BudgetCategoryType, RecurringExpense } from '../models';
import { BudgetService } from './budget.service';
import { AuthService } from './auth.service';
import { AllowanceService } from './allowance.service';

/**
 * Expense management service with Firestore persistence
 * Handles expense requests, approvals, and recurring expenses
 */
@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private readonly firestore = inject(Firestore);
  private readonly budgetService = inject(BudgetService);
  private readonly authService = inject(AuthService);
  private readonly injector = inject(Injector);
  private allowanceService?: AllowanceService;
  private isProcessingRecurring = false; // Lock to prevent duplicate processing

  /** Lazy inject AllowanceService to avoid circular dependency */
  private getAllowanceService(): AllowanceService {
    if (!this.allowanceService) {
      this.allowanceService = this.injector.get(AllowanceService);
    }
    return this.allowanceService;
  }

  private readonly expensesSignal = signal<Expense[]>([]);
  private readonly recurringExpensesSignal = signal<RecurringExpense[]>([]);
  private readonly loadingSignal = signal<boolean>(true);
  private unsubscribeExpenses?: () => void;
  private unsubscribeRecurring?: () => void;

  /** All expenses */
  readonly expenses = this.expensesSignal.asReadonly();

  /** All recurring expenses */
  readonly recurringExpenses = this.recurringExpensesSignal.asReadonly();

  /** Loading state */
  readonly loading = this.loadingSignal.asReadonly();

  /** Pending expenses awaiting approval */
  readonly pendingExpenses = computed(() =>
    this.expensesSignal().filter((e) => e.status === ExpenseStatus.PENDING)
  );

  /** Approved expenses */
  readonly approvedExpenses = computed(() =>
    this.expensesSignal().filter((e) => e.status === ExpenseStatus.APPROVED)
  );

  /** Rejected expenses */
  readonly rejectedExpenses = computed(() =>
    this.expensesSignal().filter((e) => e.status === ExpenseStatus.REJECTED)
  );

  /** Current month's expenses */
  readonly currentMonthExpenses = computed(() => {
    const now = new Date();
    return this.expensesSignal().filter((e) => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
    });
  });

  /** Total pending amount */
  readonly totalPendingAmount = computed(() =>
    this.pendingExpenses().reduce((sum, e) => sum + e.amount, 0)
  );

  constructor() {
    // Subscribe to expenses when authenticated
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth) {
        this.subscribeToExpenses();
        this.subscribeToRecurringExpenses();
      } else {
        this.unsubscribeExpenses?.();
        this.unsubscribeRecurring?.();
        this.expensesSignal.set([]);
        this.recurringExpensesSignal.set([]);
      }
    });
  }

  /**
   * Subscribe to real-time expense updates from Firestore
   */
  private subscribeToExpenses(): void {
    this.loadingSignal.set(true);
    const expensesCollection = collection(this.firestore, 'expenses');
    const q = query(expensesCollection, orderBy('createdAt', 'desc'));

    this.unsubscribeExpenses = onSnapshot(q, (snapshot) => {
      const expenses = snapshot.docs.map((doc) => this.convertDocToExpense(doc));
      this.expensesSignal.set(expenses);
      this.loadingSignal.set(false);
    });
  }

  /**
   * Subscribe to real-time recurring expense updates
   */
  private subscribeToRecurringExpenses(): void {
    const recurringCollection = collection(this.firestore, 'recurringExpenses');
    const q = query(recurringCollection, orderBy('createdAt', 'desc'));

    this.unsubscribeRecurring = onSnapshot(q, (snapshot) => {
      const recurring = snapshot.docs.map((doc) => this.convertDocToRecurring(doc));
      this.recurringExpensesSignal.set(recurring);
      // Delay processing to ensure all services are ready
      setTimeout(() => this.processRecurringExpenses(), 1000);
    });
  }

  /**
   * Process all active recurring expenses for the current month
   * Creates approved expenses and updates budget for each due recurring expense
   * For allowances with target user, also sets the user's allowance
   * Queries Firestore directly to avoid signal timing issues
   */
  async processRecurringExpenses(): Promise<void> {
    // Prevent duplicate processing
    if (this.isProcessingRecurring) {
      console.log('Already processing recurring expenses, skipping...');
      return;
    }

    this.isProcessingRecurring = true;

    try {
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Query Firestore directly for fresh data
      const recurringRef = collection(this.firestore, 'recurringExpenses');
      const q = query(recurringRef, where('isActive', '==', true));
      const snapshot = await getDocs(q);

      const activeRecurring: RecurringExpense[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const recurring: RecurringExpense = {
          id: docSnap.id,
          userId: data['userId'],
          userName: data['userName'],
          amount: data['amount'],
          category: data['category'] as BudgetCategoryType,
          categoryId: data['categoryId'],
          description: data['description'],
          dayOfMonth: data['dayOfMonth'],
          isActive: data['isActive'] ?? true,
          lastProcessedMonth: data['lastProcessedMonth'],
          targetUserId: data['targetUserId'],
          targetUserName: data['targetUserName'],
          createdAt: data['createdAt']?.toDate() ?? new Date(),
          updatedAt: data['updatedAt']?.toDate() ?? new Date(),
        };

        // Filter: due for processing and not yet processed this month
        if (recurring.dayOfMonth <= currentDay && recurring.lastProcessedMonth !== currentMonth) {
          activeRecurring.push(recurring);
        }
      });

      for (const recurring of activeRecurring) {
        try {
          // Create the expense date for this month on the recurring day
          const expenseDate = new Date(now.getFullYear(), now.getMonth(), recurring.dayOfMonth);

          // Check if this is an allowance with a target user
          const isAllowanceForUser = recurring.category === BudgetCategoryType.ALLOWANCES &&
                                      recurring.targetUserId &&
                                      recurring.targetUserName;

          if (isAllowanceForUser) {
            // Set the allowance for the target user (this also updates the budget)
            const result = await this.getAllowanceService().setAllowance(
              recurring.targetUserId!,
              recurring.targetUserName!,
              recurring.amount,
              expenseDate.getMonth() + 1,
              expenseDate.getFullYear()
            );

            if (!result) {
              console.error(`[Recurring] FAILED to set allowance for ${recurring.targetUserName}`);
              continue;
            }

            // Create an expense record for tracking - attribute to target user for accurate family member tracking
            const newExpense: Record<string, any> = {
              userId: recurring.targetUserId!,
              userName: recurring.targetUserName!,
              amount: recurring.amount,
              category: recurring.category,
              description: `[Recurring Allowance] ${recurring.description}`,
              date: Timestamp.fromDate(expenseDate),
              status: ExpenseStatus.APPROVED,
              isRecurring: true,
              recurringDay: recurring.dayOfMonth,
              approvedBy: 'system',
              approvedAt: Timestamp.now(),
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };

            if (recurring.categoryId) {
              newExpense['categoryId'] = recurring.categoryId;
            }

            await addDoc(collection(this.firestore, 'expenses'), newExpense);
          } else if (recurring.category === BudgetCategoryType.ALLOWANCES) {
            // Allowance without target user - just deduct from budget
            const newExpense: Record<string, any> = {
              userId: recurring.userId,
              userName: recurring.userName,
              amount: recurring.amount,
              category: recurring.category,
              description: `[Recurring] ${recurring.description}`,
              date: Timestamp.fromDate(expenseDate),
              status: ExpenseStatus.APPROVED,
              isRecurring: true,
              recurringDay: recurring.dayOfMonth,
              approvedBy: 'system',
              approvedAt: Timestamp.now(),
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };

            if (recurring.categoryId) {
              newExpense['categoryId'] = recurring.categoryId;
            }

            await addDoc(collection(this.firestore, 'expenses'), newExpense);

            // Update budget category
            await this.budgetService.addExpenseToCategory(
              expenseDate.getMonth() + 1,
              expenseDate.getFullYear(),
              recurring.category,
              recurring.amount,
              recurring.categoryId
            );
          } else {
            // Regular recurring expense
            const newExpense: Record<string, any> = {
              userId: recurring.userId,
              userName: recurring.userName,
              amount: recurring.amount,
              category: recurring.category,
              description: `[Recurring] ${recurring.description}`,
              date: Timestamp.fromDate(expenseDate),
              status: ExpenseStatus.APPROVED,
              isRecurring: true,
              recurringDay: recurring.dayOfMonth,
              approvedBy: 'system',
              approvedAt: Timestamp.now(),
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };

            if (recurring.categoryId) {
              newExpense['categoryId'] = recurring.categoryId;
            }

            await addDoc(collection(this.firestore, 'expenses'), newExpense);

            // Update budget category for the expense month
            await this.budgetService.addExpenseToCategory(
              expenseDate.getMonth() + 1,
              expenseDate.getFullYear(),
              recurring.category,
              recurring.amount,
              recurring.categoryId
            );
          }

          // Mark recurring expense as processed for this month IMMEDIATELY
          const recurringDocRef = doc(this.firestore, 'recurringExpenses', recurring.id);
          await updateDoc(recurringDocRef, {
            lastProcessedMonth: currentMonth,
            updatedAt: Timestamp.now(),
          });
        } catch (error) {
          console.error(`Error processing recurring expense ${recurring.id}:`, error);
        }
      }
    } finally {
      this.isProcessingRecurring = false;
    }
  }

  /**
   * Reset the lastProcessedMonth for a recurring expense so it can be reprocessed
   */
  async resetRecurringExpense(recurringId: string): Promise<void> {
    try {
      const recurringRef = doc(this.firestore, 'recurringExpenses', recurringId);
      await updateDoc(recurringRef, {
        lastProcessedMonth: null,
        updatedAt: Timestamp.now(),
      });
      console.log(`Reset recurring expense ${recurringId} for reprocessing`);
    } catch (error) {
      console.error('Error resetting recurring expense:', error);
    }
  }

  /**
   * Convert Firestore document to Expense
   */
  private convertDocToExpense(doc: any): Expense {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data['userId'],
      userName: data['userName'],
      amount: data['amount'],
      category: data['category'] as BudgetCategoryType,
      categoryId: data['categoryId'],
      description: data['description'],
      date: data['date']?.toDate() ?? new Date(),
      status: data['status'] as ExpenseStatus,
      isRecurring: data['isRecurring'] ?? false,
      approvedBy: data['approvedBy'],
      approvedAt: data['approvedAt']?.toDate(),
      rejectionReason: data['rejectionReason'],
      createdAt: data['createdAt']?.toDate() ?? new Date(),
      updatedAt: data['updatedAt']?.toDate() ?? new Date(),
    };
  }

  /**
   * Convert Firestore document to RecurringExpense
   */
  private convertDocToRecurring(doc: any): RecurringExpense {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data['userId'],
      userName: data['userName'],
      amount: data['amount'],
      category: data['category'] as BudgetCategoryType,
      categoryId: data['categoryId'],
      description: data['description'],
      dayOfMonth: data['dayOfMonth'],
      isActive: data['isActive'] ?? true,
      lastProcessedMonth: data['lastProcessedMonth'],
      targetUserId: data['targetUserId'],
      targetUserName: data['targetUserName'],
      createdAt: data['createdAt']?.toDate() ?? new Date(),
      updatedAt: data['updatedAt']?.toDate() ?? new Date(),
    };
  }

  /**
   * Get expenses for a specific user
   */
  getExpensesByUser(userId: string): Expense[] {
    return this.expensesSignal().filter((e) => e.userId === userId);
  }

  /**
   * Get expenses by status
   */
  getExpensesByStatus(status: ExpenseStatus): Expense[] {
    return this.expensesSignal().filter((e) => e.status === status);
  }

  /**
   * Get expenses by category
   */
  getExpensesByCategory(category: BudgetCategoryType): Expense[] {
    return this.expensesSignal().filter((e) => e.category === category);
  }

  /**
   * Submit a new expense request (User action)
   */
  async submitExpense(
    userId: string,
    userName: string,
    amount: number,
    category: BudgetCategoryType,
    description: string,
    date: Date = new Date(),
    categoryId?: string
  ): Promise<Expense | null> {
    try {
      const newExpense: Record<string, any> = {
        userId,
        userName,
        amount,
        category,
        description,
        date: Timestamp.fromDate(date),
        status: ExpenseStatus.PENDING,
        isRecurring: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Add categoryId if provided (for custom categories)
      if (categoryId) {
        newExpense['categoryId'] = categoryId;
      }

      const docRef = await addDoc(collection(this.firestore, 'expenses'), newExpense);
      return {
        id: docRef.id,
        userId,
        userName,
        amount,
        category,
        categoryId,
        description,
        date,
        status: ExpenseStatus.PENDING,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error submitting expense:', error);
      return null;
    }
  }

  /**
   * Approve an expense request (Admin action)
   * @param expenseIdOrExpense - Either the expense ID or the expense object directly
   * @param approvedBy - The ID of the user approving the expense
   */
  async approveExpense(expenseIdOrExpense: string | Expense, approvedBy: string): Promise<boolean> {
    try {
      let expense: Expense | undefined;
      let expenseId: string;

      if (typeof expenseIdOrExpense === 'string') {
        // Look up expense from signal
        expenseId = expenseIdOrExpense;
        expense = this.expensesSignal().find((e) => e.id === expenseId);
        console.log('Approving expense by ID:', expense);
        if (!expense || expense.status !== ExpenseStatus.PENDING) {
          console.log('Expense not found or not pending:', { found: !!expense, status: expense?.status });
          return false;
        }
      } else {
        // Use the provided expense object directly (for immediate approval after creation)
        expense = expenseIdOrExpense;
        expenseId = expense.id;
        console.log('Approving expense directly:', expense);
      }

      const expenseRef = doc(this.firestore, 'expenses', expenseId);
      await updateDoc(expenseRef, {
        status: ExpenseStatus.APPROVED,
        approvedBy,
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Deduct from budget category
      const expenseDate = new Date(expense.date);
      console.log('Adding expense to category:', {
        month: expenseDate.getMonth() + 1,
        year: expenseDate.getFullYear(),
        category: expense.category,
        categoryId: expense.categoryId,
        amount: expense.amount
      });

      const result = await this.budgetService.addExpenseToCategory(
        expenseDate.getMonth() + 1,
        expenseDate.getFullYear(),
        expense.category,
        expense.amount,
        expense.categoryId
      );

      console.log('addExpenseToCategory result:', result);
      return true;
    } catch (error) {
      console.error('Error approving expense:', error);
      return false;
    }
  }

  /**
   * Delete an expense (Admin action)
   * If the expense was approved, also removes the amount from the budget category
   */
  async deleteExpense(expenseId: string): Promise<boolean> {
    try {
      const expense = this.expensesSignal().find((e) => e.id === expenseId);
      if (!expense) {
        console.error('Expense not found:', expenseId);
        return false;
      }

      // If expense was approved, remove from budget category
      if (expense.status === ExpenseStatus.APPROVED) {
        const expenseDate = new Date(expense.date);
        await this.budgetService.removeExpenseFromCategory(
          expenseDate.getMonth() + 1,
          expenseDate.getFullYear(),
          expense.category,
          expense.amount,
          expense.categoryId
        );
      }

      // Delete the expense document
      await deleteDoc(doc(this.firestore, 'expenses', expenseId));
      console.log('Expense deleted:', expenseId);
      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      return false;
    }
  }

  /**
   * Reject an expense request (Admin action)
   */
  async rejectExpense(expenseId: string, reason: string): Promise<boolean> {
    try {
      const expense = this.expensesSignal().find((e) => e.id === expenseId);
      if (!expense || expense.status !== ExpenseStatus.PENDING) return false;

      const expenseRef = doc(this.firestore, 'expenses', expenseId);
      await updateDoc(expenseRef, {
        status: ExpenseStatus.REJECTED,
        rejectionReason: reason,
        updatedAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error('Error rejecting expense:', error);
      return false;
    }
  }

  /**
   * Create a recurring expense (Admin only)
   * For allowances, targetUserId and targetUserName specify who receives the allowance
   */
  async createRecurringExpense(
    userId: string,
    userName: string,
    amount: number,
    category: BudgetCategoryType,
    description: string,
    dayOfMonth: number,
    categoryId?: string,
    targetUserId?: string,
    targetUserName?: string
  ): Promise<RecurringExpense | null> {
    try {
      const recurring: Record<string, any> = {
        userId,
        userName,
        amount,
        category,
        description,
        dayOfMonth: Math.min(Math.max(dayOfMonth, 1), 28),
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Add categoryId if provided
      if (categoryId) {
        recurring['categoryId'] = categoryId;
      }

      // Add target user for allowances
      if (targetUserId && targetUserName) {
        recurring['targetUserId'] = targetUserId;
        recurring['targetUserName'] = targetUserName;
      }

      const docRef = await addDoc(collection(this.firestore, 'recurringExpenses'), recurring);
      return {
        id: docRef.id,
        userId,
        userName,
        amount,
        category,
        categoryId,
        description,
        dayOfMonth: Math.min(Math.max(dayOfMonth, 1), 28),
        isActive: true,
        targetUserId,
        targetUserName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating recurring expense:', error);
      return null;
    }
  }

  /**
   * Update a recurring expense (Admin only)
   */
  async updateRecurringExpense(
    id: string,
    amount: number,
    category: BudgetCategoryType,
    description: string,
    dayOfMonth: number,
    categoryId?: string,
    targetUserId?: string,
    targetUserName?: string
  ): Promise<boolean> {
    try {
      const recurringRef = doc(this.firestore, 'recurringExpenses', id);
      const updateData: Record<string, any> = {
        amount,
        category,
        description,
        dayOfMonth: Math.min(Math.max(dayOfMonth, 1), 28),
        updatedAt: Timestamp.now(),
      };

      if (categoryId) {
        updateData['categoryId'] = categoryId;
      }

      // Update target user for allowances
      if (targetUserId && targetUserName) {
        updateData['targetUserId'] = targetUserId;
        updateData['targetUserName'] = targetUserName;
      } else {
        // Clear target user if not an allowance
        updateData['targetUserId'] = null;
        updateData['targetUserName'] = null;
      }

      await updateDoc(recurringRef, updateData);
      return true;
    } catch (error) {
      console.error('Error updating recurring expense:', error);
      return false;
    }
  }

  /**
   * Toggle recurring expense active status (Admin only)
   */
  async toggleRecurringExpense(id: string): Promise<boolean> {
    try {
      const recurring = this.recurringExpensesSignal().find((r) => r.id === id);
      if (!recurring) return false;

      const recurringRef = doc(this.firestore, 'recurringExpenses', id);
      await updateDoc(recurringRef, {
        isActive: !recurring.isActive,
        updatedAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error('Error toggling recurring expense:', error);
      return false;
    }
  }

  /**
   * Delete a recurring expense (Admin only)
   */
  async deleteRecurringExpense(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(this.firestore, 'recurringExpenses', id));
      return true;
    } catch (error) {
      console.error('Error deleting recurring expense:', error);
      return false;
    }
  }

  /**
   * Get expense statistics by category
   */
  getExpensesByCategory$(month: number, year: number): Record<BudgetCategoryType, number> {
    const expenses = this.expensesSignal().filter((e) => {
      const date = new Date(e.date);
      return (
        e.status === ExpenseStatus.APPROVED &&
        date.getMonth() + 1 === month &&
        date.getFullYear() === year
      );
    });

    const result: Record<BudgetCategoryType, number> = {
      [BudgetCategoryType.FOOD]: 0,
      [BudgetCategoryType.UTILITIES]: 0,
      [BudgetCategoryType.SCHOOL]: 0,
      [BudgetCategoryType.ALLOWANCES]: 0,
      [BudgetCategoryType.SAVINGS]: 0,
      [BudgetCategoryType.EMERGENCY]: 0,
      [BudgetCategoryType.TRANSPORTATION]: 0,
      [BudgetCategoryType.HEALTHCARE]: 0,
      [BudgetCategoryType.ENTERTAINMENT]: 0,
      [BudgetCategoryType.OTHER]: 0,
    };

    expenses.forEach((e) => {
      result[e.category] += e.amount;
    });

    return result;
  }
}
