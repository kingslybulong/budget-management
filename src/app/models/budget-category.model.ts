import { BudgetCategoryType } from './budget-category.enum';

/**
 * Budget category with monthly limits and tracking
 */
export interface BudgetCategory {
  id: string;
  type: BudgetCategoryType;
  name: string;
  monthlyLimit: number;
  spent: number;
  warningThreshold: number; // Percentage (e.g., 0.8 for 80%)
  month: number; // 1-12
  year: number;
  icon?: string; // Bootstrap icon class
  color?: string; // Bootstrap color class
}

/**
 * Monthly budget containing all categories
 */
export interface MonthlyBudget {
  id: string;
  month: number;
  year: number;
  totalBudget: number;
  categories: BudgetCategory[];
  createdAt: Date;
  updatedAt: Date;
}
