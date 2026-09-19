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
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import {
  OPERATION_ICON_CHOICES,
  OperationTypeService,
} from '../../core/services/operation-type.service';
import {
  BalanceEffect,
  CommissionMode,
  OperationType,
} from '../../core/models/user.models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { matchesSearch } from '../../core/utils/text-search';

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
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  providers: [MessageService],
  templateUrl: './operation-types.html',
})
export class OperationTypesPage implements OnInit {
  private readonly ops = inject(OperationTypeService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);

  readonly operationTypes = signal<OperationType[]>([]);
  opVisible = false;
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
    const req$ =
      this.editingOpId == null
        ? this.ops.create(payload)
        : this.ops.update(this.editingOpId, payload);
    req$.subscribe({
      next: () => {
        this.opVisible = false;
        this.messages.add({
          severity: 'success',
          summary: 'Type d’opération',
          detail: this.editingOpId == null ? 'Créé' : 'Mis à jour',
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
    const mode = op.commissionMode ?? 'PERCENT';
    const value = Number(op.commissionValue ?? 0);
    return mode === 'FIXED' ? `${value.toLocaleString('fr-FR')} XOF` : `${value} %`;
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
