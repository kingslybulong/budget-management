import { BudgetCategoryType } from './budget-category.enum';
import { ExpenseStatus } from './expense-status.enum';

/**
 * Expense request submitted by users
 */
export interface Expense {
  id: string;
  userId: string;
  userName: string; // Denormalized for display
  amount: number;
  category: BudgetCategoryType;
  categoryId?: string; // ID of the specific category (for custom categories)
  description: string;
  date: Date;
  status: ExpenseStatus;
  isRecurring: boolean;
  recurringDay?: number; // Day of month for recurring expenses (1-28)
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

/**
 * Recurring expense template
 */
export interface RecurringExpense {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  category: BudgetCategoryType;
  categoryId?: string; // ID of the specific category (for custom categories)
  description: string;
  dayOfMonth: number; // 1-28 to avoid month-end issues
  isActive: boolean;
  lastProcessedMonth?: string; // Format: 'YYYY-MM' to track last processed month
  targetUserId?: string; // For allowances: the user receiving the allowance
  targetUserName?: string; // For allowances: the user's name
  createdAt: Date;
  updatedAt: Date;
}
