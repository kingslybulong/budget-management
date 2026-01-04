import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { ExpenseStatus } from '../../../models';

/**
 * Badge component for expense status
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (status()) {
      @case ('pending') {
        <span class="badge bg-warning text-dark">
          <i class="bi bi-clock me-1"></i>Pending
        </span>
      }
      @case ('approved') {
        <span class="badge bg-success">
          <i class="bi bi-check-circle me-1"></i>Approved
        </span>
      }
      @case ('rejected') {
        <span class="badge bg-danger">
          <i class="bi bi-x-circle me-1"></i>Rejected
        </span>
      }
    }
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<ExpenseStatus>();
}
