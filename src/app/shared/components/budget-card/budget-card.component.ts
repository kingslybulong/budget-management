import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PesoPipe } from '../../pipes';

/**
 * Reusable budget card component
 * Displays budget information with progress bar
 */
@Component({
  selector: 'app-budget-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PesoPipe, DecimalPipe],
  template: `
    <div class="card h-100 shadow-sm">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h6 class="card-subtitle text-muted mb-1">{{ title() }}</h6>
            <h4 class="card-title mb-0">{{ spent() | peso }}</h4>
          </div>
          @if (icon()) {
            <div class="rounded-circle p-2" [class]="'bg-' + color() + '-subtle'">
              <i [class]="'bi ' + icon() + ' fs-4 text-' + color()"></i>
            </div>
          }
        </div>

        <div class="progress mb-2" style="height: 8px;">
          <div
            class="progress-bar"
            [class]="'bg-' + progressColor()"
            role="progressbar"
            [style.width.%]="percentage()"
            [attr.aria-valuenow]="percentage()"
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>

        <div class="d-flex justify-content-between small">
          <span class="text-muted">{{ percentage() | number: '1.0-0' }}% used</span>
          <span [class]="'text-' + progressColor()">{{ limit() | peso }} limit</span>
        </div>

        @if (showRemaining()) {
          <div class="mt-2 text-end">
            <span class="badge" [class]="'bg-' + progressColor() + '-subtle text-' + progressColor()">
              {{ remaining() | peso }} remaining
            </span>
          </div>
        }
      </div>
    </div>
  `,
})
export class BudgetCardComponent {
  /** Card title */
  readonly title = input.required<string>();

  /** Amount spent */
  readonly spent = input.required<number>();

  /** Budget limit */
  readonly limit = input.required<number>();

  /** Bootstrap icon class (e.g., 'bi-cart') */
  readonly icon = input<string>('');

  /** Bootstrap color (e.g., 'primary', 'success') */
  readonly color = input<string>('primary');

  /** Warning threshold as decimal (e.g., 0.8 for 80%) */
  readonly warningThreshold = input<number>(0.8);

  /** Whether to show remaining amount */
  readonly showRemaining = input<boolean>(true);

  /** Calculate percentage used */
  readonly percentage = computed(() => {
    const limit = this.limit();
    if (limit === 0) return 0;
    return Math.min((this.spent() / limit) * 100, 100);
  });

  /** Calculate remaining amount */
  readonly remaining = computed(() => Math.max(this.limit() - this.spent(), 0));

  /** Determine progress bar color based on usage */
  readonly progressColor = computed(() => {
    const pct = this.percentage() / 100;
    if (pct >= 1) return 'danger';
    if (pct >= this.warningThreshold()) return 'warning';
    return 'success';
  });
}
