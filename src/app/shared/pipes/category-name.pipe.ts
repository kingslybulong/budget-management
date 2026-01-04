import { Pipe, PipeTransform } from '@angular/core';
import { BudgetCategoryType } from '../../models';

/**
 * Maps category types to display names
 */
const CATEGORY_NAMES: Record<BudgetCategoryType, string> = {
  [BudgetCategoryType.FOOD]: 'Food & Groceries',
  [BudgetCategoryType.UTILITIES]: 'Utilities',
  [BudgetCategoryType.SCHOOL]: 'School & Education',
  [BudgetCategoryType.ALLOWANCES]: 'Allowances',
  [BudgetCategoryType.SAVINGS]: 'Savings',
  [BudgetCategoryType.EMERGENCY]: 'Emergency Fund',
  [BudgetCategoryType.TRANSPORTATION]: 'Transportation',
  [BudgetCategoryType.HEALTHCARE]: 'Healthcare',
  [BudgetCategoryType.ENTERTAINMENT]: 'Entertainment',
  [BudgetCategoryType.OTHER]: 'Other',
};

/**
 * Pipe to display category type as readable name
 */
@Pipe({
  name: 'categoryName',
})
export class CategoryNamePipe implements PipeTransform {
  transform(value: BudgetCategoryType | null | undefined): string {
    if (!value) return '';
    return CATEGORY_NAMES[value] ?? value;
  }
}
