/**
 * Monthly allowance for a user
 */
export interface Allowance {
  id: string;
  userId: string;
  userName: string; // Denormalized for display
  monthlyAmount: number;
  spent: number;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Allowance transaction record
 */
export interface AllowanceTransaction {
  id: string;
  allowanceId: string;
  userId: string;
  amount: number;
  description: string;
  category?: string; // Custom category (user-defined)
  date: Date;
  createdAt: Date;
}

/**
 * Personal spending categories for allowance (suggestions only)
 */
export enum AllowanceSpendingCategory {
  FOOD_SNACKS = 'Food & Snacks',
  ENTERTAINMENT = 'Entertainment',
  SCHOOL_SUPPLIES = 'School Supplies',
  TRANSPORTATION = 'Transportation',
  CLOTHING = 'Clothing',
  SAVINGS = 'Savings',
  GIFTS = 'Gifts',
  OTHER = 'Other'
}

/**
 * User savings goal
 */
export interface SavingsGoal {
  id: string;
  userId: string;
  name: string; // e.g., "New Phone", "Birthday Gift"
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
