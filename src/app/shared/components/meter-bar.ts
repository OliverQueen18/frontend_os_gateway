import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-meter-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex min-w-[96px] items-center gap-2" [attr.title]="label + ': ' + value + '%'">
      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div class="h-full rounded-full transition-all duration-500" [ngClass]="barClass" [style.width.%]="clamped"></div>
      </div>
      <span class="w-8 text-right text-xs tabular-nums text-slate-600">{{ value }}%</span>
    </div>
  `,
})
export class MeterBarComponent {
  @Input({ required: true }) value!: number;
  @Input() label = '';
  @Input() kind: 'battery' | 'signal' = 'battery';

  get clamped(): number {
    return Math.max(0, Math.min(100, this.value ?? 0));
  }

  get barClass(): string {
    if (this.clamped < 25) return 'bg-rose-500';
    if (this.clamped < 50) return 'bg-amber-500';
    return this.kind === 'signal' ? 'bg-sky-500' : 'bg-brand-600';
  }
}
