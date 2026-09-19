import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="kpi-card group">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ label }}</p>
          <p class="mt-2 font-display text-2xl font-semibold text-slate-900">{{ value }}</p>
          @if (hint) {
            <p class="mt-1 text-xs text-slate-500">{{ hint }}</p>
          }
        </div>
        <span
          class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-100"
        >
          <i [class]="icon"></i>
        </span>
      </div>
      @if (delta) {
        <p class="mt-3 text-xs font-medium" [class.text-emerald-600]="trend === 'up'" [class.text-rose-600]="trend === 'down'" [class.text-slate-500]="!trend">
          {{ delta }}
        </p>
      }
    </article>
  `,
})
export class KpiCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() hint = '';
  @Input() delta = '';
  @Input() trend: 'up' | 'down' | '' = '';
  @Input() icon = 'pi pi-chart-line';
}
