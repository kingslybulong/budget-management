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
  category?: AllowanceSpendingCategory; // Personal spending category
  date: Date;
  createdAt: Date;
}

/**
 * Personal spending categories for allowance
 */
export enum AllowanceSpendingCategory {
  FOOD_SNACKS = 'FOOD_SNACKS',
  ENTERTAINMENT = 'ENTERTAINMENT',
  SCHOOL_SUPPLIES = 'SCHOOL_SUPPLIES',
  TRANSPORTATION = 'TRANSPORTATION',
  CLOTHING = 'CLOTHING',
  SAVINGS = 'SAVINGS',
  GIFTS = 'GIFTS',
  OTHER = 'OTHER'
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
