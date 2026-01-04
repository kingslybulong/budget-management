import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to format numbers as currency (Philippine Peso)
 */
@Pipe({
  name: 'peso',
})
export class PesoPipe implements PipeTransform {
  transform(value: number | null | undefined, showSymbol = true): string {
    if (value === null || value === undefined) return showSymbol ? '₱0.00' : '0.00';

    const formatted = value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return showSymbol ? `₱${formatted}` : formatted;
  }
}
