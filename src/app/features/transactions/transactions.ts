import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import { PhoneInputComponent } from '../../shared/components/phone-input';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { TransactionService } from '../../core/services/transaction.service';
import { DistributorService } from '../../core/services/distributor.service';
import { OperationTypeService } from '../../core/services/operation-type.service';
import { GatewayService } from '../../core/services/gateway.service';
import {
  CancellationReason,
  CancellationReasonService,
} from '../../core/services/cancellation-reason.service';
import { Transaction, TransactionFilters, TransactionHistoryEvent } from '../../core/models/transaction.models';
import { TransactionStatus, TxPriority } from '../../core/models/api.models';
import { CommissionRule, Distributor, OperationType } from '../../core/models/user.models';
import { Gateway } from '../../core/models/gateway.models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { matchesSearch } from '../../core/utils/text-search';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    SelectModule,
    DatePickerModule,
    ButtonModule,
    DrawerModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    TagModule,
    ToastModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    PhoneInputComponent,
    RelativeTimePipe,
  ],
  providers: [MessageService],
  templateUrl: './transactions.html',
})
export class TransactionsPage implements OnInit {
  private readonly api = inject(TransactionService);
  private readonly distributorsApi = inject(DistributorService);
  private readonly opsApi = inject(OperationTypeService);
  private readonly gatewaysApi = inject(GatewayService);
  private readonly cancellationReasonsApi = inject(CancellationReasonService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);

  readonly rows = signal<Transaction[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly distributors = signal<Distributor[]>([]);
  readonly gateways = signal<Gateway[]>([]);
  readonly operationTypes = signal<OperationType[]>([]);
  readonly cancellationReasons = signal<CancellationReason[]>([]);
  drawerVisible = false;
  createVisible = false;
  cancelVisible = false;
  readonly selected = signal<Transaction | null>(null);
  readonly cancelTarget = signal<Transaction | null>(null);
  readonly timeline = signal<TransactionHistoryEvent[]>([]);

  cancelReasonId: number | null = null;
  cancelNote = '';

  get cancelReasonChoices(): Array<{ label: string; value: number }> {
    return this.cancellationReasons().map((r) => ({ label: r.label, value: r.id }));
  }

  filters: TransactionFilters = { page: 0, size: 10 };
  fromDate: Date = TransactionsPage.startOfDay();
  toDate: Date = TransactionsPage.startOfDay();
  search = '';
  pageSize = 10;

  filteredRows(): Transaction[] {
    return this.rows().filter((tx) =>
      matchesSearch(
        this.search,
        tx.reference,
        tx.type,
        tx.operator,
        tx.status,
        this.distributorName(tx.distributorId),
        this.distributorPhone(tx.distributorId),
        this.gatewayRef(tx.gatewayId),
        this.gatewayPhone(tx.gatewayId),
        tx.phoneNumber,
        tx.beneficiaryPhone,
        tx.amount,
        tx.note,
      ),
    );
  }

  readonly statuses: Array<{ label: string; value: TransactionStatus }> = [
    { label: 'En attente', value: 'PENDING' },
    { label: 'En file', value: 'QUEUED' },
    { label: 'Assignée', value: 'ASSIGNED' },
    { label: 'En cours', value: 'PROCESSING' },
    { label: 'Attente SMS', value: 'WAITING_SMS_CONFIRMATION' },
    { label: 'Succès', value: 'SUCCESS' },
    { label: 'Échec', value: 'FAILED' },
    { label: 'Expirée', value: 'TIMEOUT' },
    { label: 'Annulée', value: 'CANCELLED' },
  ];

  readonly operators = [
    { label: 'Orange', value: 'ORANGE' },
    { label: 'Moov', value: 'MOOV' },
    { label: 'Malitel', value: 'MALITEL' },
    { label: 'MTN', value: 'MTN' },
    { label: 'Wave', value: 'WAVE' },
  ];

  readonly operatorChoices = this.operators;

  readonly priorities: Array<{ label: string; value: TxPriority }> = [
    { label: 'Normale', value: 'NORMAL' },
    { label: 'Urgente', value: 'URGENT' },
    { label: 'Basse', value: 'BASSE' },
  ];

  readonly form = this.fb.nonNullable.group({
    distributorId: [null as number | null, Validators.required],
    operator: ['ORANGE', Validators.required],
    type: ['DEPOT', Validators.required],
    beneficiaryPhone: [''],
    amount: [1000 as number | null],
    pin: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
    priority: ['NORMAL' as TxPriority],
  });

  selectedOperationType(): OperationType | undefined {
    const code = this.form.controls.type.value;
    return this.operationTypes().find((t) => t.code === code);
  }

  requiresPhone(): boolean {
    return this.selectedOperationType()?.requiresPhone !== false;
  }

  requiresAmount(): boolean {
    return this.selectedOperationType()?.requiresAmount !== false;
  }

  private applyTypeFieldValidators(typeCode: string): void {
    const op = this.operationTypes().find((t) => t.code === typeCode);
    const phoneRequired = op?.requiresPhone !== false;
    const amountRequired = op?.requiresAmount !== false;
    const phoneCtrl = this.form.controls.beneficiaryPhone;
    const amountCtrl = this.form.controls.amount;
    phoneCtrl.setValidators(phoneRequired ? [Validators.required] : []);
    amountCtrl.setValidators(
      amountRequired ? [Validators.required, Validators.min(1)] : [Validators.min(0)],
    );
    phoneCtrl.updateValueAndValidity({ emitEvent: false });
    amountCtrl.updateValueAndValidity({ emitEvent: false });
  }

  get commissionPreview(): {
    total: number;
    admin: number;
    distributor: number;
    operator: number;
    label: string;
  } {
    const typeCode = this.form.controls.type.value;
    const amount = Number(this.form.controls.amount.value ?? 0);
    const op = this.operationTypes().find((t) => t.code === typeCode);
    const operatorCode = (this.form.controls.operator.value ?? '').toUpperCase();
    const today = new Date().toISOString().slice(0, 10);
    const matched = (op?.commissionRules ?? [])
      .filter((rule) => {
        if (rule.active === false) return false;
        if ((rule.operatorCode ?? '').toUpperCase() !== operatorCode) return false;
        const min = Number(rule.amountMin ?? 0);
        const max = rule.amountMax == null ? null : Number(rule.amountMax);
        if (amount < min) return false;
        if (max != null && amount > max) return false;
        if (rule.validFrom && String(rule.validFrom).slice(0, 10) > today) return false;
        if (rule.validTo && String(rule.validTo).slice(0, 10) < today) return false;
        return true;
      })
      .sort((a, b) => {
        const width = (rule: typeof a) => {
          const min = Number(rule.amountMin ?? 0);
          const max = rule.amountMax == null ? 1_000_000_000_000 : Number(rule.amountMax);
          return max - min;
        };
        const priority = Number(b.priority ?? 0) - Number(a.priority ?? 0);
        return priority !== 0 ? priority : width(a) - width(b);
      })[0];
    if (matched) {
      return this.previewFromRule(amount, matched);
    }
    const override = op?.operatorCommissions?.find(
      (rule) => (rule.operatorCode ?? '').toUpperCase() === operatorCode,
    );
    const mode = override?.commissionMode ?? op?.commissionMode ?? 'PERCENT';
    const value = Number(override?.commissionValue ?? op?.commissionValue ?? 1.5);
    const adminShare = Number(override?.adminSharePercent ?? op?.adminSharePercent ?? 40);
    const total =
      mode === 'FIXED'
        ? Math.round(value * 100) / 100
        : Math.round(((amount * value) / 100) * 100) / 100;
    const admin = Math.round(((total * adminShare) / 100) * 100) / 100;
    const distributor = Math.round((total - admin) * 100) / 100;
    const label = mode === 'FIXED' ? `${value} XOF fixe` : `${value} %`;
    return { total, admin, distributor, operator: 0, label };
  }

  private previewFromRule(
    amount: number,
    rule: CommissionRule,
  ): { total: number; admin: number; distributor: number; operator: number; label: string } {
    const money = (value: number) => Math.round(value * 100) / 100;
    const percentOf = (base: number, rate: number | null | undefined) =>
      rate == null ? 0 : money((base * Number(rate)) / 100);
    const clamp = (value: number, min?: number | null, max?: number | null) => {
      let result = value;
      if (min != null && result < Number(min)) result = Number(min);
      if (max != null && result > Number(max)) result = Number(max);
      return money(result);
    };
    if (rule.calculationMode === 'DIRECT_ON_AMOUNT') {
      let distributor = percentOf(amount, rule.distributorRate);
      let admin = percentOf(amount, rule.adminRate);
      let operator = percentOf(amount, rule.operatorRate);
      let total = money(distributor + admin + operator);
      const clamped = clamp(total, rule.commissionMin, rule.commissionMax);
      if (total > 0 && clamped !== total) {
        const factor = clamped / total;
        distributor = money(distributor * factor);
        admin = money(admin * factor);
        operator = money(Math.max(0, clamped - distributor - admin));
        total = clamped;
      }
      return { total, admin, distributor, operator, label: 'taux sur le montant' };
    }
    const raw = (amount * Number(rule.ratePercent ?? 0)) / 100;
    const base = clamp(raw, rule.commissionMin, rule.commissionMax);
    const distributor = percentOf(base, rule.distributorRate);
    const admin = percentOf(base, rule.adminRate);
    const operator = percentOf(base, rule.operatorRate);
    return {
      total: money(distributor + admin + operator),
      admin,
      distributor,
      operator,
      label: `base ${base.toLocaleString('fr-FR')} XOF`,
    };
  }

  get filterTypes(): Array<{ label: string; value: string; icon?: string }> {
    return this.operationTypes().map((t) => ({
      label: t.label,
      value: t.code,
      icon: t.icon || 'pi pi-bolt',
    }));
  }

  /** Tous les types d’opération actifs (aucun autre filtre). */
  readonly typeChoices = computed(() =>
    this.operationTypes()
      .filter((t) => t.active)
      .map((t) => ({ label: t.label, value: t.code, icon: t.icon || 'pi pi-bolt' })),
  );

  typeIcon(code: string | undefined | null): string {
    if (!code) return 'pi pi-bolt';
    return this.operationTypes().find((t) => t.code === code)?.icon || 'pi pi-bolt';
  }

  typeLabel(code: string | undefined | null): string {
    if (!code) return '—';
    return this.operationTypes().find((t) => t.code === code)?.label || code;
  }

  get distributorChoices(): Array<{ label: string; value: number }> {
    return this.distributors().map((d) => ({ label: this.distLabel(d), value: d.id }));
  }

  get filterDistributorChoices(): Array<{ label: string; value: number }> {
    return this.distributors().map((d) => ({ label: this.distributorName(d.id), value: d.id }));
  }

  ngOnInit(): void {
    this.opsApi.list(true).subscribe((list) => {
      this.operationTypes.set(list ?? []);
      this.applyTypeFieldValidators(this.form.controls.type.value);
    });
    this.distributorsApi.list(true).subscribe((page) => this.distributors.set(page?.content ?? []));
    this.gatewaysApi.list().subscribe((list) => this.gateways.set(list ?? []));
    this.cancellationReasonsApi.list(true).subscribe((list) => this.cancellationReasons.set(list ?? []));
    this.form.controls.type.valueChanges.subscribe((typeCode) => {
      this.applyTypeFieldValidators(typeCode);
      if (!this.requiresAmount()) {
        this.form.controls.amount.setValue(0, { emitEvent: false });
      } else if (!this.form.controls.amount.value) {
        this.form.controls.amount.setValue(1000, { emitEvent: false });
      }
      if (!this.requiresPhone()) {
        this.form.controls.beneficiaryPhone.setValue('', { emitEvent: false });
      }
    });
  }

  load(): void {
    this.loading.set(true);
    const { from, to } = this.periodBounds();
    this.api
      .list({
        page: this.filters.page ?? 0,
        size: this.filters.size ?? 10,
        type: this.filters.type || undefined,
        status: this.filters.status || undefined,
        operator: this.filters.operator || undefined,
        distributorId: this.filters.distributorId ?? undefined,
        from,
        to,
      })
      .subscribe({
        next: (page) => {
          this.rows.set(page?.content ?? []);
          this.total.set(page?.totalElements ?? 0);
          this.pageSize = page?.size ?? this.filters.size ?? 10;
          this.loading.set(false);
        },
        error: (err) => {
          this.rows.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'Transactions',
            detail: apiErrorMessage(err, 'Impossible de charger les transactions'),
          });
        },
      });
  }

  reloadFromFilters(): void {
    this.filters = { ...this.filters, page: 0 };
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? 10;
    const first = event.first ?? 0;
    this.filters = { ...this.filters, page: Math.floor(first / rows), size: rows };
    this.pageSize = rows;
    this.load();
  }

  setToday(): void {
    const today = TransactionsPage.startOfDay();
    this.fromDate = today;
    this.toDate = new Date(today);
    this.reloadFromFilters();
  }

  private periodBounds(): { from: string; to: string } {
    let from = this.fromDate ? new Date(this.fromDate) : TransactionsPage.startOfDay();
    let to = this.toDate ? new Date(this.toDate) : new Date(from);
    from = TransactionsPage.startOfDay(from);
    to = TransactionsPage.startOfDay(to);
    if (from.getTime() > to.getTime()) {
      const swap = from;
      from = to;
      to = swap;
      this.fromDate = from;
      this.toDate = to;
    }
    return { from: this.toIsoDate(from), to: this.toIsoDate(to) };
  }

  private static startOfDay(d: Date = new Date()): Date {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  openCreate(): void {
    const firstDist = this.distributors()[0];
    const choices = this.typeChoices();
    const firstType =
      choices.find((t) => t.value.toUpperCase() === 'DEPOT')?.value ??
      choices[0]?.value ??
      'DEPOT';
    this.form.reset({
      distributorId: firstDist?.id ?? null,
      operator: 'ORANGE',
      type: firstType,
      beneficiaryPhone: '',
      amount: 1000,
      pin: '',
      priority: 'NORMAL',
    });
    this.applyTypeFieldValidators(firstType);
    if (!this.requiresAmount()) {
      this.form.controls.amount.setValue(0, { emitEvent: false });
    }
    this.createVisible = true;
  }

  save(): void {
    this.applyTypeFieldValidators(this.form.controls.type.value);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messages.add({
        severity: 'warn',
        summary: 'Formulaire',
        detail: 'Complétez les champs obligatoires, y compris le PIN distributeur',
      });
      return;
    }
    const raw = this.form.getRawValue();
    this.api
      .create({
        distributorId: raw.distributorId,
        pin: raw.pin,
        operator: raw.operator,
        type: raw.type,
        beneficiaryPhone: this.requiresPhone() ? raw.beneficiaryPhone : null,
        amount: this.requiresAmount() ? Number(raw.amount) : 0,
        priority: raw.priority,
      })
      .subscribe({
        next: () => {
          this.createVisible = false;
          this.messages.add({
            severity: 'success',
            summary: 'Transaction',
            detail: 'Créée et mise en file',
          });
          this.load();
          this.distributorsApi.list(true).subscribe((page) => this.distributors.set(page.content));
        },
        error: (err) =>
          this.messages.add({
            severity: 'error',
            summary: 'Transaction',
            detail: apiErrorMessage(err, 'Création impossible'),
          }),
      });
  }

  openDetail(tx: Transaction): void {
    this.selected.set(tx);
    this.drawerVisible = true;
    this.api.timeline(tx.id).subscribe((t) => this.timeline.set(t));
  }

  cancel(tx: Transaction): void {
    if (!this.canCancel(tx)) {
      this.messages.add({
        severity: 'warn',
        summary: 'Transaction',
        detail: 'Ce type d’opération n’est pas annulable',
      });
      return;
    }
    this.cancelTarget.set(tx);
    this.cancelReasonId = this.cancellationReasons()[0]?.id ?? null;
    this.cancelNote = '';
    this.cancelVisible = true;
  }

  confirmCancel(): void {
    const tx = this.cancelTarget();
    if (!tx) return;
    if (this.cancelReasonId == null) {
      this.messages.add({
        severity: 'warn',
        summary: 'Annulation',
        detail: 'Sélectionnez un motif d’annulation',
      });
      return;
    }
    this.api.cancel(tx.id, this.cancelReasonId, this.cancelNote.trim() || null).subscribe({
      next: () => {
        this.cancelVisible = false;
        this.cancelTarget.set(null);
        this.drawerVisible = false;
        this.messages.add({
          severity: 'success',
          summary: 'Transaction',
          detail: 'Annulée — montant et commission remboursés',
        });
        this.load();
        this.distributorsApi.list(true).subscribe((page) => this.distributors.set(page.content));
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Transaction',
          detail: apiErrorMessage(err, 'Annulation impossible'),
        }),
    });
  }

  cancellationReasonLabel(id: number | null | undefined): string {
    if (id == null) return '—';
    return this.cancellationReasons().find((r) => r.id === id)?.label ?? `#${id}`;
  }

  /** PENDING / QUEUED / ASSIGNED and operation type marked cancellable (default true). */
  canCancel(tx: Transaction): boolean {
    const cancellableStatus =
      tx.status === 'PENDING' || tx.status === 'QUEUED' || tx.status === 'ASSIGNED';
    if (!cancellableStatus) return false;
    const code = String(tx.type ?? '').toUpperCase();
    const op = this.operationTypes().find((o) => o.code.toUpperCase() === code);
    return op?.cancellable !== false;
  }

  distLabel(d: Distributor): string {
    const name = [d.firstName, d.lastName].filter(Boolean).join(' ') || d.name;
    return `${d.code} — ${name} (${Number(d.balance).toLocaleString('fr-FR')} XOF)`;
  }

  distributorName(distributorId: number | null | undefined): string {
    if (distributorId == null) return '—';
    const d = this.distributors().find((x) => x.id === distributorId);
    if (!d) return `#${distributorId}`;
    const name = [d.firstName, d.lastName].filter(Boolean).join(' ') || d.name;
    return `${d.code} — ${name}`;
  }

  distributorPhone(distributorId: number | null | undefined): string {
    if (distributorId == null) return '';
    return this.distributors().find((x) => x.id === distributorId)?.phone?.trim() ?? '';
  }

  private gatewayById(gatewayId: number | null | undefined): Gateway | undefined {
    if (gatewayId == null) return undefined;
    return this.gateways().find((g) => g.id === gatewayId);
  }

  /** Référence gateway (deviceId), sinon #id. */
  gatewayRef(gatewayId: number | null | undefined): string {
    const g = this.gatewayById(gatewayId);
    if (!g) return gatewayId != null ? `#${gatewayId}` : '';
    return g.deviceId || g.name || `#${g.id}`;
  }

  gatewayPhone(gatewayId: number | null | undefined): string {
    return this.gatewayById(gatewayId)?.phoneNumber?.trim() ?? '';
  }
}
