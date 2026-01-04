import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

/**
 * Wrapper component for Chart.js
 */
@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart-container" [style.height]="height()">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: `
    .chart-container {
      position: relative;
      width: 100%;
    }
    canvas {
      width: 100% !important;
    }
  `,
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private chart: Chart | null = null;

  /** Chart type (bar, line, pie, doughnut, etc.) */
  readonly type = input.required<ChartType>();

  /** Chart data */
  readonly data = input.required<ChartConfiguration['data']>();

  /** Chart options */
  readonly options = input<ChartConfiguration['options']>({});

  /** Chart height */
  readonly height = input<string>('300px');

  /** Emits when chart is clicked */
  readonly chartClick = output<unknown>();

  constructor() {
    // React to data changes
    effect(() => {
      const data = this.data();
      if (this.chart && data) {
        this.chart.data = data;
        this.chart.update();
      }
    });
  }

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private createChart(): void {
    const canvas = this.elementRef.nativeElement.querySelector('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: this.type(),
      data: this.data(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...this.options(),
        onClick: (event, elements) => {
          if (elements.length > 0) {
            this.chartClick.emit(elements[0]);
          }
        },
      },
    });
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  /** Public method to update chart */
  updateChart(): void {
    if (this.chart) {
      this.chart.update();
    }
  }
}
