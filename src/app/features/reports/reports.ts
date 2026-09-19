import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { ReportExportKind, ReportPayload, ReportQuery, ReportService } from '../../core/services/report.service';
import { AuthService } from '../../core/services/auth.service';
import { DistributorService } from '../../core/services/distributor.service';
import { GatewayService } from '../../core/services/gateway.service';
import { OperationTypeService } from '../../core/services/operation-type.service';
import { matchesSearch } from '../../core/utils/text-search';

type DatePreset = 'today' | '7d' | '30d' | 'month' | 'year';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    SelectModule,
    TabsModule,
    ToastModule,
    PageHeaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './reports.html',
  styles: [
    `
      .report-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: end;
      }
      .report-filters__field {
        display: grid;
        gap: 0.35rem;
        flex: 1 1 14rem;
        min-width: min(100%, 14rem);
        max-width: 28rem;
      }
      .report-filters__field > span {
        font-size: 0.8rem;
        font-weight: 600;
        color: #334155;
      }
      .report-filters__presets {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        align-items: center;
      }
      .report-filters__period {
        margin: 0.85rem 0 0;
        font-size: 0.85rem;
        color: var(--muted);
      }
      .report-filters__search {
        position: relative;
        flex: 1 1 16rem;
        min-width: 14rem;
        max-width: 24rem;
      }
      .report-filters__search > i {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        color: #64748b;
        pointer-events: none;
      }
      .report-filters__search > input {
        width: 100%;
        padding-left: 2.25rem;
      }
      :host ::ng-deep .report-datepicker,
      :host ::ng-deep .report-datepicker.p-datepicker,
      :host ::ng-deep .report-datepicker .p-datepicker,
      :host ::ng-deep .report-datepicker .p-inputtext {
        width: 100% !important;
        min-width: 18rem;
      }
      :host ::ng-deep .report-datepicker .p-datepicker-input {
        width: 100%;
        letter-spacing: 0.01em;
      }
    `,
  ],
})
export class ReportsPage implements OnInit {
  private readonly api = inject(ReportService);
  private readonly auth = inject(AuthService);
  private readonly distributorsApi = inject(DistributorService);
  private readonly gatewaysApi = inject(GatewayService);
  private readonly operationTypesApi = inject(OperationTypeService);
  private readonly messages = inject(MessageService);

  readonly report = signal<ReportPayload | null>(null);
  readonly commissions = signal<ReportPayload | null>(null);
  readonly exporting = signal(false);
  activeTab = '0';
  activePreset: DatePreset | null = '7d';
  readonly today = new Date();
  range: Date[] | null = this.presetRange('7d');
  search = '';

  distributorId: number | null = null;
  operationType = '';
  gatewayId: number | null = null;

  readonly distributorOptions = signal<Array<{ label: string; value: number | null }>>([
    { label: 'Tous les distributeurs', value: null },
  ]);
  readonly typeOptions = signal<Array<{ label: string; value: string }>>([
    { label: 'Tous les types', value: '' },
  ]);
  readonly gatewayOptions = signal<Array<{ label: string; value: number | null }>>([
    { label: 'Toutes les gateways', value: null },
  ]);

  readonly presets: Array<{ key: DatePreset; label: string }> = [
    { key: 'today', label: 'Aujourd’hui' },
    { key: '7d', label: '7 jours' },
    { key: '30d', label: '30 jours' },
    { key: 'month', label: 'Ce mois' },
    { key: 'year', label: 'Cette année' },
  ];

  get isDistributorOnly(): boolean {
    const user = this.auth.user();
    if (!user?.roles?.length) return false;
    if (user.roles.includes('ADMIN') || user.roles.includes('SUPERVISOR')) return false;
    return user.roles.includes('DISTRIBUTEUR') || user.roles.includes('DISTRIBUTOR');
  }

  get periodLabel(): string {
    const { from, to } = this.periodDates();
    return `${this.formatDisplay(from)} → ${this.formatDisplay(to)}`;
  }

  get exportLabel(): string {
    return this.activeTab === '0' ? 'Exporter CSV transactions' : 'Exporter CSV commissions';
  }

  filteredTxRows(): Array<Record<string, unknown>> {
    const rows = this.report()?.rows ?? [];
    return rows.filter((row) =>
      matchesSearch(
        this.search,
        row['operator'],
        row['type'],
        row['status'],
        row['count'],
        row['total_amount'],
      ),
    );
  }

  filteredCommissionRows(): Array<Record<string, unknown>> {
    const rows = this.commissions()?.rows ?? [];
    return rows.filter((row) =>
      matchesSearch(
        this.search,
        row['distributor_code'],
        row['distributor_name'],
        row['operator'],
        row['type'],
        row['count'],
        row['total_amount'],
      ),
    );
  }

  ngOnInit(): void {
    if (this.isDistributorOnly) this.activeTab = '1';
    this.loadFilterOptions();
    this.load();
  }

  applyPreset(key: DatePreset): void {
    this.activePreset = key;
    this.range = this.presetRange(key);
    this.load();
  }

  onRangeChange(): void {
    this.activePreset = null;
  }

  load(): void {
    const query = this.buildQuery();
    if (!this.isDistributorOnly) {
      this.api.transactions(query).subscribe((r) => this.report.set(r));
    }
    this.api.commissions(query, this.isDistributorOnly).subscribe((r) => this.commissions.set(r));
  }

  exportCsv(): void {
    if (this.exporting()) return;
    const query = this.buildQuery();
    const report = this.currentExportKind();
    this.exporting.set(true);
    this.api.downloadCsv(report, query).subscribe({
      next: () => {
        this.exporting.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Export',
          detail: 'Fichier CSV téléchargé',
        });
      },
      error: () => {
        this.exporting.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Export',
          detail: 'Échec du téléchargement CSV',
        });
      },
    });
  }

  private loadFilterOptions(): void {
    if (!this.isDistributorOnly) {
      this.distributorsApi.list(undefined, 0, 200).subscribe({
        next: (page) => {
          this.distributorOptions.set([
            { label: 'Tous les distributeurs', value: null },
            ...(page.content ?? []).map((d) => ({
              label: `${d.code || d.id} — ${d.name || [d.firstName, d.lastName].filter(Boolean).join(' ') || '—'}`,
              value: d.id,
            })),
          ]);
        },
      });
    }
    this.operationTypesApi.list(true).subscribe({
      next: (types) => {
        this.typeOptions.set([
          { label: 'Tous les types', value: '' },
          ...types.map((t) => ({ label: t.label || t.code, value: t.code })),
        ]);
      },
    });
    this.gatewaysApi.list().subscribe({
      next: (gateways) => {
        this.gatewayOptions.set([
          { label: 'Toutes les gateways', value: null },
          ...gateways.map((g) => ({
            label: `${g.name || g.deviceId} (${g.operator || '—'})`,
            value: g.id,
          })),
        ]);
      },
    });
  }

  private buildQuery(): ReportQuery {
    const { from, to } = this.periodIso();
    return {
      from,
      to,
      distributorId: this.isDistributorOnly ? null : this.distributorId,
      type: this.operationType || null,
      gatewayId: this.gatewayId,
    };
  }

  private currentExportKind(): ReportExportKind {
    if (this.activeTab === '0' && !this.isDistributorOnly) {
      return 'transactions';
    }
    return this.isDistributorOnly ? 'commissions-me' : 'commissions';
  }

  num(row: Record<string, unknown>, key: string): number {
    const v = row[key];
    return typeof v === 'number' ? v : Number(v ?? 0);
  }

  private periodDates(): { from: Date; to: Date } {
    const start = this.range?.[0] ?? new Date();
    const end = this.range?.[1] ?? this.range?.[0] ?? new Date();
    return { from: this.startOfDay(start), to: this.startOfDay(end) };
  }

  private periodIso(): { from: string; to: string } {
    const { from, to } = this.periodDates();
    return { from: this.toLocalIsoDate(from), to: this.toLocalIsoDate(to) };
  }

  private presetRange(key: DatePreset): Date[] {
    const end = this.startOfDay(new Date());
    const start = new Date(end);
    switch (key) {
      case 'today':
        break;
      case '7d':
        start.setDate(end.getDate() - 6);
        break;
      case '30d':
        start.setDate(end.getDate() - 29);
        break;
      case 'month':
        start.setDate(1);
        break;
      case 'year':
        start.setMonth(0, 1);
        break;
    }
    return [start, end];
  }

  private startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private toLocalIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDisplay(d: Date): string {
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
}
