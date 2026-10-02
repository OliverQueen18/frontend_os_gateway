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
      .rule-card {
        border: 1px solid var(--p-content-border-color, #e5e7eb);
        border-radius: 12px;
        padding: 0.9rem;
        margin-bottom: 0.85rem;
        background: #f8fafc;
      }
      .rule-card__head,
      .rule-fields {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
      .rule-card label {
        display: grid;
        gap: 0.3rem;
        min-width: 0;
      }
      .rule-card label > span {
        font-size: 0.75rem;
        font-weight: 650;
        color: #475569;
      }
      .rule-card .p-select,
      .rule-card .p-inputnumber,
      .rule-card input {
        width: 100%;
        min-width: 0;
      }
      :host ::ng-deep .rule-card .p-inputnumber-input {
        width: 100%;
      }
      .rule-section { margin-top: 0.85rem; }
      .rule-section__title {
        margin: 0 0 0.45rem;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #64748b;
      }
      .rule-card__tools {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin-top: 0.85rem;
        padding-top: 0.75rem;
        border-top: 1px solid #e5e7eb;
      }
      .rule-card__tools .switch-row { margin: 0; }
      .bareme-actions {
        position: sticky;
        bottom: 0;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.5rem;
        padding: 0.85rem 0 0.15rem;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0), #fff 28%);
      }
      @media (min-width: 720px) {
        .rule-card__head { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.1fr); }
        .rule-fields { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .rule-fields--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
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

  readonly iconChoices = OPERATION_ICON_CHOICES;

  readonly opForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    label: ['', Validators.required],
    description: [''],
    icon: ['pi pi-bolt', Validators.required],
    balanceEffect: ['DEBIT' as BalanceEffect, Validators.required],
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
      active: op.active,
      cancellable: op.cancellable !== false,
      requiresPhone: op.requiresPhone !== false,
      requiresAmount: op.requiresAmount !== false,
    });
    this.opForm.controls.code.disable();
    this.opVisible = true;
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
    const payload = {
      ...raw,
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
    return 'Aucun palier';
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
