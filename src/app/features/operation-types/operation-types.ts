import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import {
  OPERATION_ICON_CHOICES,
  OperationTypeService,
} from '../../core/services/operation-type.service';
import { OperatorService } from '../../core/services/operator.service';
import {
  BalanceEffect,
  CommissionCalculationMode,
  CommissionMode,
  CommissionRule,
  OperationType,
} from '../../core/models/user.models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { matchesSearch } from '../../core/utils/text-search';

interface CommissionRuleDraft {
  key: string;
  operatorCode: string;
  amountMin: number | null;
  amountMax: number | null;
  calculationMode: CommissionCalculationMode;
  ratePercent: number | null;
  commissionMin: number | null;
  commissionMax: number | null;
  distributorRate: number | null;
  adminRate: number | null;
  operatorRate: number | null;
  validFrom: string;
  validTo: string;
  active: boolean;
}

@Component({
  selector: 'app-operation-types',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ToggleSwitchModule,
    InputNumberModule,
    ToastModule,
    TooltipModule,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  providers: [MessageService],
  templateUrl: './operation-types.html',
  styles: [
    `
      .muted { color: var(--p-text-muted-color, #6b7280); font-size: 0.85rem; margin: 0.25rem 0 0.75rem; }
      .rule-card { border: 1px solid var(--p-content-border-color, #e5e7eb); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem; }
      .rule-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem 0.75rem; }
    `,
  ],
})
export class OperationTypesPage implements OnInit {
  private readonly ops = inject(OperationTypeService);
  private readonly operatorApi = inject(OperatorService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);

  readonly operationTypes = signal<OperationType[]>([]);
  readonly commissionRuleDrafts = signal<CommissionRuleDraft[]>([]);
  readonly operatorChoices = signal<Array<{ label: string; value: string }>>([]);
  readonly baremeModes = [
    { label: 'Base puis répartition', value: 'BASE_THEN_SPLIT' as const },
    { label: 'Taux sur le montant', value: 'DIRECT_ON_AMOUNT' as const },
  ];
  opVisible = false;
  baremeVisible = false;
  baremeTypeId: number | null = null;
  baremeTitle = 'Barème de commission';
  editingOpId: number | null = null;
  search = '';

  filteredOperationTypes(): OperationType[] {
    return this.operationTypes().filter((op) =>
      matchesSearch(this.search, op.code, op.label, op.description, op.balanceEffect),
    );
  }

  readonly balanceEffects: Array<{ label: string; value: BalanceEffect }> = [
    { label: 'Débite le solde UV', value: 'DEBIT' },
    { label: 'Crédite le solde UV', value: 'CREDIT' },
    { label: 'Sans impact solde', value: 'NONE' },
  ];

  readonly commissionModes: Array<{ label: string; value: CommissionMode }> = [
    { label: 'Taux (%)', value: 'PERCENT' },
    { label: 'Montant fixe (XOF)', value: 'FIXED' },
  ];

  readonly iconChoices = OPERATION_ICON_CHOICES;

  readonly opForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    label: ['', Validators.required],
    description: [''],
    icon: ['pi pi-bolt', Validators.required],
    balanceEffect: ['DEBIT' as BalanceEffect, Validators.required],
    commissionMode: ['PERCENT' as CommissionMode, Validators.required],
    commissionValue: [1.5, [Validators.required, Validators.min(0)]],
    adminSharePercent: [40, [Validators.required, Validators.min(0), Validators.max(100)]],
    distributorSharePercent: [60, [Validators.required, Validators.min(0), Validators.max(100)]],
    active: [true],
    cancellable: [true],
    requiresPhone: [true],
    requiresAmount: [true],
  });

  ngOnInit(): void {
    this.reloadOps();
  }

  reloadOps(): void {
    this.ops.list(false).subscribe((list) => this.operationTypes.set(list));
  }

  openCreateOp(): void {
    this.editingOpId = null;
    this.opForm.reset({
      code: '',
      label: '',
      description: '',
      icon: 'pi pi-bolt',
      balanceEffect: 'DEBIT',
      commissionMode: 'PERCENT',
      commissionValue: 1.5,
      adminSharePercent: 40,
      distributorSharePercent: 60,
      active: true,
      cancellable: true,
      requiresPhone: true,
      requiresAmount: true,
    });
    this.opForm.controls.code.enable();
    this.opVisible = true;
  }

  openEditOp(op: OperationType): void {
    this.editingOpId = op.id;
    this.opForm.reset({
      code: op.code,
      label: op.label,
      description: op.description ?? '',
      icon: op.icon || 'pi pi-bolt',
      balanceEffect: op.balanceEffect,
      commissionMode: op.commissionMode ?? 'PERCENT',
      commissionValue: Number(op.commissionValue ?? 1.5),
      adminSharePercent: Number(op.adminSharePercent ?? 40),
      distributorSharePercent: Number(op.distributorSharePercent ?? 60),
      active: op.active,
      cancellable: op.cancellable !== false,
      requiresPhone: op.requiresPhone !== false,
      requiresAmount: op.requiresAmount !== false,
    });
    this.opForm.controls.code.disable();
    this.opVisible = true;
  }

  onAdminShareChange(value: number | null): void {
    const admin = Number(value ?? 0);
    this.opForm.patchValue(
      { adminSharePercent: admin, distributorSharePercent: Math.max(0, 100 - admin) },
      { emitEvent: false },
    );
  }

  onDistributorShareChange(value: number | null): void {
    const dist = Number(value ?? 0);
    this.opForm.patchValue(
      { distributorSharePercent: dist, adminSharePercent: Math.max(0, 100 - dist) },
      { emitEvent: false },
    );
  }

  saveOp(): void {
    if (this.opForm.invalid) {
      this.opForm.markAllAsTouched();
      this.messages.add({
        severity: 'warn',
        summary: 'Type d’opération',
        detail: 'Complétez les champs obligatoires avant d’enregistrer.',
      });
      return;
    }
    const raw = this.opForm.getRawValue();
    const admin = Math.round(Number(raw.adminSharePercent ?? 0) * 100) / 100;
    const distributor = Math.round(Number(raw.distributorSharePercent ?? 0) * 100) / 100;
    if (Math.abs(admin + distributor - 100) > 0.01) {
      this.opForm.controls.adminSharePercent.setErrors({ sum: true });
      this.messages.add({
        severity: 'warn',
        summary: 'Type d’opération',
        detail: 'La somme des parts admin + distributeur doit être égale à 100 %.',
      });
      return;
    }
    const payload = {
      ...raw,
      adminSharePercent: admin,
      distributorSharePercent: distributor,
      commissionValue: Number(raw.commissionValue ?? 0),
      requiresPhone: !!raw.requiresPhone,
      requiresAmount: !!raw.requiresAmount,
      cancellable: !!raw.cancellable,
      active: !!raw.active,
    };
    const wasCreate = this.editingOpId == null;
    const req$ = wasCreate ? this.ops.create(payload) : this.ops.update(this.editingOpId!, payload);
    req$.subscribe({
      next: () => {
        this.opVisible = false;
        this.messages.add({
          severity: 'success',
          summary: 'Type d’opération',
          detail: wasCreate ? 'Créé' : 'Mis à jour',
        });
        this.reloadOps();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Type d’opération',
          detail: apiErrorMessage(err, 'Échec de l’enregistrement'),
        }),
    });
  }

  commissionLabel(op: OperationType): string {
    const rules = op.commissionRules?.length ?? 0;
    if (rules > 0) {
      return `${rules} palier${rules > 1 ? 's' : ''}`;
    }
    const mode = op.commissionMode ?? 'PERCENT';
    const value = Number(op.commissionValue ?? 0);
    return mode === 'FIXED' ? `${value.toLocaleString('fr-FR')} XOF` : `${value} %`;
  }

  openBareme(op: OperationType): void {
    this.baremeTypeId = op.id;
    this.baremeTitle = `Barème — ${op.label}`;
    this.baremeVisible = true;
    this.operatorApi.list(true).subscribe({
      next: (operators) =>
        this.operatorChoices.set(
          operators.map((operator) => ({
            label: `${operator.name} (${operator.code})`,
            value: operator.code,
          })),
        ),
      error: () => this.operatorChoices.set([]),
    });
    this.ops.listCommissionRules(op.id).subscribe({
      next: (rules) => this.commissionRuleDrafts.set(rules.map((rule) => this.toDraft(rule))),
      error: (err) => {
        this.commissionRuleDrafts.set([]);
        this.messages.add({
          severity: 'error',
          summary: 'Barème',
          detail: apiErrorMessage(err, 'Impossible de charger le barème'),
        });
      },
    });
  }

  addRule(): void {
    const operatorCode = this.operatorChoices()[0]?.value ?? '';
    this.commissionRuleDrafts.update((rows) => [
      ...rows,
      {
        key: `new-${Date.now()}-${rows.length}`,
        operatorCode,
        amountMin: 0,
        amountMax: null,
        calculationMode: 'BASE_THEN_SPLIT',
        ratePercent: 1,
        commissionMin: 50,
        commissionMax: 10000,
        distributorRate: 70,
        adminRate: 30,
        operatorRate: null,
        validFrom: '',
        validTo: '',
        active: true,
      },
    ]);
  }

  removeRule(key: string): void {
    this.commissionRuleDrafts.update((rows) => rows.filter((row) => row.key !== key));
  }

  patchRule(key: string, patch: Partial<CommissionRuleDraft>): void {
    this.commissionRuleDrafts.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  saveBareme(): void {
    if (this.baremeTypeId == null) return;
    const drafts = this.commissionRuleDrafts();
    for (const row of drafts) {
      if (!row.operatorCode) {
        this.messages.add({ severity: 'warn', summary: 'Barème', detail: 'Choisissez un opérateur pour chaque palier.' });
        return;
      }
      if (row.calculationMode === 'BASE_THEN_SPLIT' && (row.ratePercent == null || Number(row.ratePercent) < 0)) {
        this.messages.add({
          severity: 'warn',
          summary: 'Barème',
          detail: 'Le taux de base est obligatoire pour une règle « base puis répartition ».',
        });
        return;
      }
      if (row.amountMax != null && Number(row.amountMax) < Number(row.amountMin ?? 0)) {
        this.messages.add({
          severity: 'warn',
          summary: 'Barème',
          detail: 'Le montant max doit être supérieur ou égal au montant min.',
        });
        return;
      }
    }
    const payload: CommissionRule[] = drafts.map((row) => ({
      operatorCode: row.operatorCode,
      amountMin: Number(row.amountMin ?? 0),
      amountMax: row.amountMax == null ? null : Number(row.amountMax),
      calculationMode: row.calculationMode,
      ratePercent: row.calculationMode === 'BASE_THEN_SPLIT' ? Number(row.ratePercent ?? 0) : null,
      commissionMin: row.commissionMin == null ? null : Number(row.commissionMin),
      commissionMax: row.commissionMax == null ? null : Number(row.commissionMax),
      distributorRate: Number(row.distributorRate ?? 0),
      adminRate: Number(row.adminRate ?? 0),
      operatorRate: row.operatorRate == null ? null : Number(row.operatorRate),
      validFrom: row.validFrom || null,
      validTo: row.validTo || null,
      active: row.active,
      priority: 0,
    }));
    this.ops.replaceCommissionRules(this.baremeTypeId, payload).subscribe({
      next: () => {
        this.baremeVisible = false;
        this.messages.add({ severity: 'success', summary: 'Barème', detail: 'Enregistré' });
        this.reloadOps();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Barème',
          detail: apiErrorMessage(err, 'Échec de l’enregistrement'),
        }),
    });
  }

  private toDraft(rule: CommissionRule): CommissionRuleDraft {
    return {
      key: String(rule.id ?? `new-${Math.random()}`),
      operatorCode: rule.operatorCode,
      amountMin: rule.amountMin == null ? 0 : Number(rule.amountMin),
      amountMax: rule.amountMax == null ? null : Number(rule.amountMax),
      calculationMode: rule.calculationMode,
      ratePercent: rule.ratePercent == null ? null : Number(rule.ratePercent),
      commissionMin: rule.commissionMin == null ? null : Number(rule.commissionMin),
      commissionMax: rule.commissionMax == null ? null : Number(rule.commissionMax),
      distributorRate: Number(rule.distributorRate ?? 0),
      adminRate: Number(rule.adminRate ?? 0),
      operatorRate: rule.operatorRate == null ? null : Number(rule.operatorRate),
      validFrom: rule.validFrom ? String(rule.validFrom).slice(0, 10) : '',
      validTo: rule.validTo ? String(rule.validTo).slice(0, 10) : '',
      active: rule.active !== false,
    };
  }

  removeOp(op: OperationType): void {
    if (!confirm(`Désactiver le type ${op.code} ?`)) return;
    this.ops.delete(op.id).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Type d’opération', detail: 'Désactivé' });
        this.reloadOps();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Type d’opération',
          detail: apiErrorMessage(err, 'Désactivation impossible'),
        }),
    });
  }

  effectLabel(effect: BalanceEffect): string {
    return this.balanceEffects.find((e) => e.value === effect)?.label ?? effect;
  }
}
