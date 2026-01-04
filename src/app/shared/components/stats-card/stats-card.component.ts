import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

/**
 * Reusable stats card component for dashboard metrics
 */
@Component({
  selector: 'app-stats-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card h-100 shadow-sm" [class]="'border-' + color()">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <p class="text-muted mb-1 small text-uppercase">{{ label() }}</p>
            <h3 class="mb-0 fw-bold" [class]="'text-' + color()">{{ value() }}</h3>
            @if (subtitle()) {
              <small class="text-muted">{{ subtitle() }}</small>
            }
          </div>
          @if (icon()) {
            <div
              class="rounded-circle d-flex align-items-center justify-content-center"
              [class]="'bg-' + color() + '-subtle'"
              style="width: 60px; height: 60px;"
            >
              <i [class]="'bi ' + icon() + ' fs-3 text-' + color()"></i>
            </div>
          }
        </div>

        @if (trend() !== null) {
          <div class="mt-3 pt-2 border-top">
            <small [class]="trend()! >= 0 ? 'text-success' : 'text-danger'">
              <i [class]="trend()! >= 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
              {{ trend()! >= 0 ? '+' : '' }}{{ trend() }}%
            </small>
            <small class="text-muted ms-1">vs last month</small>
          </div>
        }
      </div>
    </div>
  `,
})
export class StatsCardComponent {
  /** Stat label */
  readonly label = input.required<string>();

  /** Main value to display */
  readonly value = input.required<string>();

  /** Optional subtitle */
  readonly subtitle = input<string>('');

  /** Bootstrap icon class */
  readonly icon = input<string>('');

  /** Bootstrap color */
  readonly color = input<string>('primary');

  /** Trend percentage (optional) */
  readonly trend = input<number | null>(null);
}
