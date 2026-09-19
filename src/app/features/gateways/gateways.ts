import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import { MeterBarComponent } from '../../shared/components/meter-bar';
import { PhoneInputComponent } from '../../shared/components/phone-input';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { GatewayService } from '../../core/services/gateway.service';
import { WebsocketService } from '../../core/services/websocket.service';
import { Gateway } from '../../core/models/gateway.models';
import { GatewayStatus } from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { matchesSearch } from '../../core/utils/text-search';

@Component({
  selector: 'app-gateways',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TableModule,
    SelectModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    ToastModule,
    TooltipModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    MeterBarComponent,
    PhoneInputComponent,
    RelativeTimePipe,
  ],
  providers: [MessageService],
  templateUrl: './gateways.html',
})
export class GatewaysPage implements OnInit, OnDestroy {
  private readonly api = inject(GatewayService);
  private readonly ws = inject(WebsocketService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private sub?: Subscription;

  readonly rows = signal<Gateway[]>([]);
  readonly saving = signal(false);
  operator = '';
  status = '';
  search = '';
  visible = false;
  editingId: number | null = null;

  filteredRows(): Gateway[] {
    return this.rows().filter((g) =>
      matchesSearch(this.search, g.name, g.deviceId, g.operator, g.phoneNumber, g.status),
    );
  }

  readonly operators = [
    { label: 'Tous', value: '' },
    { label: 'Orange', value: 'ORANGE' },
    { label: 'Moov', value: 'MOOV' },
    { label: 'Malitel', value: 'MALITEL' },
    { label: 'MTN', value: 'MTN' },
    { label: 'Wave', value: 'WAVE' },
  ];

  readonly operatorChoices = this.operators.filter((o) => o.value);

  readonly statuses = [
    { label: 'Tous', value: '' },
    { label: 'Online', value: 'ONLINE' },
    { label: 'Busy', value: 'BUSY' },
    { label: 'Idle', value: 'IDLE' },
    { label: 'Offline', value: 'OFFLINE' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
    { label: 'Désactivé', value: 'DISABLED' },
  ];

  readonly statusChoices = this.statuses.filter((s) => s.value);
  readonly ussdPinVar = '{{pin}}';

  readonly form = this.fb.nonNullable.group({
    deviceId: ['', Validators.required],
    name: ['', Validators.required],
    operator: ['ORANGE', Validators.required],
    phoneNumber: [''],
    status: ['OFFLINE' as GatewayStatus],
    ussdPin: ['', [Validators.pattern(/^(\d{4,6})?$/)]],
  });

  ngOnInit(): void {
    this.load();
    this.sub = this.ws.gatewayTicks$.subscribe((list) => {
      if (!this.operator && !this.status && !this.visible) {
        this.rows.set(list);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  load(): void {
    this.api
      .list(this.operator || undefined, this.status || undefined)
      .subscribe((list) => this.rows.set(list));
  }

  openCreate(): void {
    this.editingId = null;
    this.form.reset({
      deviceId: '',
      name: '',
      operator: 'ORANGE',
      phoneNumber: '',
      status: 'OFFLINE',
      ussdPin: '',
    });
    this.form.controls.deviceId.enable();
    this.form.controls.operator.enable();
    this.form.controls.ussdPin.setValidators([Validators.required, Validators.pattern(/^\d{4,6}$/)]);
    this.form.controls.ussdPin.updateValueAndValidity();
    this.visible = true;
  }

  openEdit(g: Gateway): void {
    this.editingId = g.id;
    this.form.reset({
      deviceId: g.deviceId,
      name: g.name,
      operator: g.operator,
      phoneNumber: g.phoneNumber ?? '',
      status: g.status,
      ussdPin: '',
    });
    this.form.controls.deviceId.disable();
    this.form.controls.operator.disable();
    // Vide = conserver le PIN existant
    this.form.controls.ussdPin.setValidators([Validators.pattern(/^(\d{4,6})?$/)]);
    this.form.controls.ussdPin.updateValueAndValidity();
    this.visible = true;
  }

  onPinInput(): void {
    const digits = (this.form.controls.ussdPin.value ?? '').replace(/\D/g, '').slice(0, 6);
    this.form.controls.ussdPin.setValue(digits, { emitEvent: false });
  }

  save(): void {
    if (this.saving()) return;
    this.onPinInput();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const pinDigits = (raw.ussdPin ?? '').replace(/\D/g, '').slice(0, 6);
    if (this.editingId == null && !/^\d{4,6}$/.test(pinDigits)) {
      this.messages.add({
        severity: 'warn',
        summary: 'PIN USSD',
        detail: 'Saisissez un code PIN de 4 à 6 chiffres',
      });
      return;
    }

    const creating = this.editingId == null;
    const editingId = this.editingId;
    const req$ = creating
      ? this.api.create({
          deviceId: raw.deviceId.trim(),
          name: raw.name.trim(),
          operator: raw.operator,
          phoneNumber: raw.phoneNumber || undefined,
          ussdPin: pinDigits,
        })
      : this.api.update(editingId!, {
          name: raw.name.trim(),
          phoneNumber: raw.phoneNumber || undefined,
          status: raw.status,
          ...(pinDigits ? { ussdPin: pinDigits } : {}),
        });

    this.saving.set(true);
    this.form.disable({ emitEvent: false });
    req$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.restoreFormEnabledState();
        this.visible = false;
        this.upsertRow(saved);
        this.messages.add({
          severity: 'success',
          summary: 'Gateway',
          detail: creating ? 'Créé' : 'Mis à jour',
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.restoreFormEnabledState();
        this.messages.add({
          severity: 'error',
          summary: 'Gateway',
          detail: apiErrorMessage(err, 'Échec de l’enregistrement'),
        });
      },
    });
  }

  private restoreFormEnabledState(): void {
    this.form.enable({ emitEvent: false });
    if (this.editingId != null) {
      this.form.controls.deviceId.disable({ emitEvent: false });
      this.form.controls.operator.disable({ emitEvent: false });
    }
  }

  private upsertRow(saved: Gateway): void {
    const list = [...this.rows()];
    const idx = list.findIndex((g) => g.id === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.unshift(saved);
    this.rows.set(list);
  }

  deactivate(g: Gateway): void {
    if (!confirm(`Désactiver le gateway ${g.name} ?\nIl ne sera plus sélectionné pour les opérations.`)) return;
    this.api.deactivate(g.id).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Gateway', detail: 'Désactivé' });
        this.load();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Gateway',
          detail: apiErrorMessage(err, 'Désactivation impossible'),
        }),
    });
  }

  remove(g: Gateway): void {
    if (
      !confirm(
        `Supprimer définitivement ${g.name} (${g.deviceId}) ?\n` +
          `Les historiques de statut/logs liés seront effacés.\n` +
          `Les transactions et SMS historiques sont conservés.`,
      )
    ) {
      return;
    }
    this.api.delete(g.id).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Gateway', detail: 'Gateway supprimé' });
        this.load();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Gateway',
          detail: apiErrorMessage(err, 'Suppression impossible'),
        }),
    });
  }
}
