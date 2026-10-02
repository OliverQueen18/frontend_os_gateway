import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">{{ eyebrow }}</p>
        <h1 class="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{{ title }}</h1>
        @if (subtitle) {
          <p class="mt-1 max-w-2xl text-sm text-slate-500">{{ subtitle }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle = '';
  @Input() eyebrow = 'OS Gateway';
}
