import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import { PhoneInputComponent } from '../../shared/components/phone-input';
import { AddressMapPickerComponent, AddressGeoValue } from '../../shared/components/address-map-picker';
import { DistributorService } from '../../core/services/distributor.service';
import { GatewayService } from '../../core/services/gateway.service';
import {
  Attachment,
  AttachmentDocType,
  Distributor,
  CommissionBalance,
  CommissionPayout,
  CommissionPayoutMethod,
  RegistrationStatus,
  UvPaymentMethod,
  UvPurchase,
} from '../../core/models/user.models';
import { Gateway } from '../../core/models/gateway.models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { matchesSearch } from '../../core/utils/text-search';

@Component({
  selector: 'app-distributors',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    ToggleSwitchModule,
    ToastModule,
    TooltipModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    PhoneInputComponent,
    AddressMapPickerComponent,
  ],
  providers: [MessageService],
  templateUrl: './distributors.html',
})
export class DistributorsPage implements OnInit {
  private readonly api = inject(DistributorService);
  private readonly gatewaysApi = inject(GatewayService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('mapPicker') private mapPicker?: AddressMapPickerComponent;

  readonly rows = signal<Distributor[]>([]);
  readonly gateways = signal<Gateway[]>([]);
  readonly purchases = signal<UvPurchase[]>([]);
  readonly commissionBalances = signal<Record<number, CommissionBalance>>({});
  readonly commissionPayouts = signal<CommissionPayout[]>([]);
  readonly commissionBalance = signal<CommissionBalance | null>(null);
  readonly attachments = signal<Attachment[]>([]);
  readonly saving = signal(false);
  readonly payingCommission = signal(false);
  readonly reviewing = signal(false);
  readonly uploadingAttachment = signal(false);
  visible = false;
  uvVisible = false;
  historyVisible = false;
  commissionPayVisible = false;
  commissionHistoryVisible = false;
  reviewVisible = false;
  rejectVisible = false;
  editingId: number | null = null;
  /** Dernier login auto proposé (pour savoir si on peut encore synchroniser code → login). */
  private suggestedLoginSnapshot = '';
  uvDistributor: Distributor | null = null;
  commissionDistributor: Distributor | null = null;
  reviewDistributor: Distributor | null = null;
  registrationStatusFilter = '';
  search = '';
  rejectReason = '';
  uploadDocType: AttachmentDocType = 'OTHER';

  filteredRows(): Distributor[] {
    return this.rows().filter((d) =>
      matchesSearch(
        this.search,
        d.code,
        d.name,
        d.firstName,
        d.lastName,
        d.username,
        d.phone,
        d.email,
        d.address,
        d.registrationStatus,
      ),
    );
  }

  readonly registrationStatusFilters: Array<{ label: string; value: string }> = [
    { label: 'Tous', value: '' },
    { label: 'En attente frais', value: 'FEE_PENDING' },
    { label: 'À valider', value: 'UNDER_REVIEW' },
    { label: 'Approuvés', value: 'APPROVED' },
    { label: 'Rejetés', value: 'REJECTED' },
  ];

  readonly docTypes: Array<{ label: string; value: AttachmentDocType }> = [
    { label: 'RCCM', value: 'RCCM' },
    { label: 'NIF', value: 'NIF' },
    { label: 'NINA', value: 'NINA' },
    { label: 'Pièce d’identité', value: 'ID_CARD' },
    { label: 'Autre', value: 'OTHER' },
  ];

  readonly paymentMethods: Array<{ label: string; value: UvPaymentMethod }> = [
    { label: 'Espèces (caisse)', value: 'CASH' },
    { label: 'Dépôt via gateway', value: 'GATEWAY_DEPOSIT' },
  ];

  readonly commissionPaymentMethods: Array<{ label: string; value: CommissionPayoutMethod }> = [
    { label: 'Espèces', value: 'CASH' },
    { label: 'Virement bancaire', value: 'BANK_TRANSFER' },
    { label: 'Mobile Money', value: 'MOBILE_MONEY' },
    { label: 'Autre', value: 'OTHER' },
  ];

  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9._-]+$/)]],
    name: [''],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(8)]],
    address: [''],
    latitude: [null as number | null],
    longitude: [null as number | null],
    rccm: [''],
    nif: [''],
    nina: [''],
    pin: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
    password: [''],
    active: [true],
  });

  readonly uvForm = this.fb.nonNullable.group({
    amount: [50000, [Validators.required, Validators.min(1)]],
    paymentMethod: ['CASH' as UvPaymentMethod, Validators.required],
    gatewayId: [null as number | null],
    note: [''],
  });

  readonly commissionForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    paymentMethod: ['CASH' as CommissionPayoutMethod, Validators.required],
    reference: [''],
    note: [''],
  });

  ngOnInit(): void {
    this.reload();
  }

  private ensureGatewaysLoaded(): void {
    if (this.gateways().length > 0) return;
    this.gatewaysApi.list().subscribe((list) => this.gateways.set(list ?? []));
  }

  reload(): void {
    const status = this.registrationStatusFilter || undefined;
    this.api.list(undefined, 0, 50, status).subscribe({
      next: (page) => this.rows.set(page?.content ?? []),
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Distributeurs',
          detail: apiErrorMessage(err, 'Chargement impossible'),
        }),
    });
    this.api.commissionBalances().subscribe((list) => {
      const map: Record<number, CommissionBalance> = {};
      for (const b of list ?? []) map[b.distributorId] = b;
      this.commissionBalances.set(map);
    });
  }

  registrationStatusLabel(status?: string): string {
    switch ((status || '').toUpperCase() as RegistrationStatus | '') {
      case 'FEE_PENDING':
        return 'En attente frais';
      case 'UNDER_REVIEW':
        return 'À valider';
      case 'APPROVED':
        return 'Approuvé';
      case 'REJECTED':
        return 'Rejeté';
      default:
        return status || '—';
    }
  }

  registrationStatusTone(status?: string): string {
    switch ((status || '').toUpperCase()) {
      case 'APPROVED':
        return 'ACTIVE';
      case 'REJECTED':
        return 'FAILED';
      case 'FEE_PENDING':
      case 'UNDER_REVIEW':
        return 'PENDING';
      default:
        return 'WARNING';
    }
  }

  canReview(d: Distributor): boolean {
    const s = (d.registrationStatus || '').toUpperCase();
    return s === 'UNDER_REVIEW' || s === 'FEE_PENDING';
  }

  canApprove(d: Distributor): boolean {
    if (!this.canReview(d)) return false;
    return !!d.registrationFeePaid;
  }

  unpaidOf(d: Distributor): number {
    return this.commissionBalances()[d.id]?.unpaid ?? 0;
  }

  earnedOf(d: Distributor): number {
    return this.commissionBalances()[d.id]?.earned ?? 0;
  }

  openCreate(): void {
    this.editingId = null;
    const suggestedCode = this.suggestDistributorCode();
    const suggestedLogin = this.loginFromCode(suggestedCode);
    this.suggestedLoginSnapshot = suggestedLogin;
    this.form.reset({
      code: suggestedCode,
      username: suggestedLogin,
      name: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      latitude: null,
      longitude: null,
      rccm: '',
      nif: '',
      nina: '',
      pin: '',
      password: '',
      active: true,
    });
    this.form.controls.code.enable();
    this.form.controls.username.enable();
    this.form.controls.pin.setValidators([Validators.required, Validators.pattern(/^\d{4,6}$/)]);
    this.form.controls.pin.updateValueAndValidity();
    this.visible = true;
  }

  onDistributorDialogShow(): void {
    // Leaflet init often runs while the dialog is still sizing — refresh repeatedly.
    [50, 200, 450, 800].forEach((ms) => setTimeout(() => this.mapPicker?.refreshSize(), ms));
  }

  onGeoChange(geo: AddressGeoValue): void {
    this.form.patchValue(
      {
        address: geo.address,
        latitude: geo.latitude,
        longitude: geo.longitude,
      },
      { emitEvent: false },
    );
  }

  osmEmbedUrl(lat: number, lng: number): SafeResourceUrl {
    const delta = 0.01;
    const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  openEdit(d: Distributor): void {
    this.editingId = d.id;
    const login = d.username ?? this.loginFromCode(d.code);
    this.suggestedLoginSnapshot = login;
    this.form.reset({
      code: d.code,
      username: login,
      name: d.name,
      firstName: d.firstName ?? '',
      lastName: d.lastName ?? '',
      email: d.email ?? '',
      phone: d.phone ?? '',
      address: d.address ?? '',
      latitude: d.latitude ?? null,
      longitude: d.longitude ?? null,
      rccm: d.rccm ?? '',
      nif: d.nif ?? '',
      nina: d.nina ?? '',
      pin: '',
      password: '',
      active: d.active,
    });
    this.form.controls.code.disable();
    this.form.controls.username.enable();
    // PIN optionnel à la modification (vide = conserver)
    this.form.controls.pin.setValidators([Validators.pattern(/^(\d{4,6})?$/)]);
    this.form.controls.pin.updateValueAndValidity();
    this.visible = true;
  }

  /** Propose le prochain code DIST-XXX à partir des distributeurs chargés. */
  suggestDistributorCode(): string {
    let max = 0;
    for (const d of this.rows()) {
      const m = /^DIST-?(\d+)$/i.exec((d.code ?? '').trim());
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `DIST-${String(max + 1).padStart(3, '0')}`;
  }

  loginFromCode(code: string): string {
    const login = (code ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');
    return login || `dist${Date.now() % 100000}`;
  }

  onCodeInput(): void {
    if (this.editingId != null) return;
    const nextLogin = this.loginFromCode(this.form.controls.code.value ?? '');
    if ((this.form.controls.username.value ?? '') === this.suggestedLoginSnapshot) {
      this.form.controls.username.setValue(nextLogin, { emitEvent: false });
      this.suggestedLoginSnapshot = nextLogin;
    }
  }

  onUsernameInput(): void {
    this.suggestedLoginSnapshot = ''; // délie la synchro auto code → login
  }

  onPinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = (input.value ?? '').replace(/\D/g, '').slice(0, 6);
    if (input.value !== digits) {
      input.value = digits;
    }
    this.form.controls.pin.setValue(digits, { emitEvent: true });
  }

  save(): void {
    // Normalise le PIN (espaces / caractères collés par l’autofill)
    const pinDigits = (this.form.controls.pin.value ?? '').replace(/\D/g, '').slice(0, 6);
    this.form.controls.pin.setValue(pinDigits, { emitEvent: false });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messages.add({
        severity: 'warn',
        summary: 'Formulaire incomplet',
        detail: this.validationSummary(),
      });
      return;
    }
    const raw = this.form.getRawValue();
    const creating = this.editingId == null;
    if (creating && !/^\d{4,6}$/.test(pinDigits)) {
      this.messages.add({
        severity: 'warn',
        summary: 'PIN',
        detail: 'Saisissez un code PIN de 4 à 6 chiffres',
      });
      return;
    }
    const payload = {
      code: raw.code.trim(),
      username: raw.username.trim(),
      name: raw.name || `${raw.firstName} ${raw.lastName}`.trim(),
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      email: raw.email.trim(),
      phone: raw.phone,
      address: raw.address || undefined,
      latitude: raw.latitude,
      longitude: raw.longitude,
      rccm: raw.rccm?.trim() || undefined,
      nif: raw.nif?.trim() || undefined,
      nina: raw.nina?.trim() || undefined,
      active: raw.active,
      ...(pinDigits ? { pin: pinDigits } : {}),
      ...(raw.password ? { password: raw.password } : {}),
    };
    const req$ = creating ? this.api.create(payload) : this.api.update(this.editingId!, payload);
    this.saving.set(true);
    req$.subscribe({
      next: (created) => {
        this.saving.set(false);
        this.visible = false;
        if (!created) {
          this.messages.add({
            severity: 'warn',
            summary: 'Distributeur',
            detail: 'Enregistré, mais réponse API incomplète',
          });
          this.reload();
          return;
        }
        if (creating && created.username) {
          this.messages.add({
            severity: 'success',
            summary: 'Compte créé',
            detail: `Utilisateur ${created.username} · mot de passe ${created.temporaryPassword ?? 'ChangeMe@123'} · PIN défini`,
            life: 12000,
          });
        } else {
          this.messages.add({
            severity: 'success',
            summary: 'Distributeur',
            detail: creating ? 'Créé' : 'Mis à jour',
          });
        }
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Distributeur',
          detail: apiErrorMessage(err, 'Échec de l’enregistrement'),
        });
      },
    });
  }

  openUv(d: Distributor): void {
    this.ensureGatewaysLoaded();
    this.uvDistributor = d;
    this.uvForm.reset({
      amount: 50000,
      paymentMethod: 'CASH',
      gatewayId: null,
      note: '',
    });
    this.uvVisible = true;
  }

  saveUv(): void {
    if (!this.uvDistributor || this.uvForm.invalid) {
      this.uvForm.markAllAsTouched();
      return;
    }
    const raw = this.uvForm.getRawValue();
    if (raw.paymentMethod === 'GATEWAY_DEPOSIT' && !raw.gatewayId) {
      this.uvForm.controls.gatewayId.setErrors({ required: true });
      return;
    }
    this.api
      .purchaseUv(this.uvDistributor.id, {
        amount: Number(raw.amount),
        paymentMethod: raw.paymentMethod,
        gatewayId: raw.paymentMethod === 'GATEWAY_DEPOSIT' ? raw.gatewayId : null,
        note: raw.note || undefined,
      })
      .subscribe({
        next: () => {
          this.uvVisible = false;
          this.messages.add({ severity: 'success', summary: 'UV', detail: 'Recharge enregistrée' });
          this.reload();
        },
        error: (err) =>
          this.messages.add({
            severity: 'error',
            summary: 'UV',
            detail: apiErrorMessage(err, 'Recharge impossible'),
          }),
      });
  }

  openHistory(d: Distributor): void {
    this.uvDistributor = d;
    this.api.listUvPurchases(d.id).subscribe((list) => {
      this.purchases.set(list);
      this.historyVisible = true;
    });
  }

  openCommissionPay(d: Distributor): void {
    this.commissionDistributor = d;
    this.api.commissionBalance(d.id).subscribe({
      next: (bal) => {
        this.commissionBalance.set(bal);
        this.commissionForm.reset({
          amount: bal.unpaid > 0 ? bal.unpaid : 0,
          paymentMethod: 'CASH',
          reference: '',
          note: '',
        });
        this.commissionPayVisible = true;
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Commission',
          detail: apiErrorMessage(err, 'Impossible de charger le solde commission'),
        }),
    });
  }

  payAllCommission(): void {
    const unpaid = this.commissionBalance()?.unpaid ?? 0;
    if (unpaid > 0) {
      this.commissionForm.controls.amount.setValue(unpaid);
    }
  }

  saveCommissionPayout(): void {
    if (!this.commissionDistributor || this.commissionForm.invalid) {
      this.commissionForm.markAllAsTouched();
      return;
    }
    const unpaid = this.commissionBalance()?.unpaid ?? 0;
    const amount = Number(this.commissionForm.controls.amount.value);
    if (amount <= 0) {
      this.messages.add({
        severity: 'warn',
        summary: 'Commission',
        detail: 'Montant invalide',
      });
      return;
    }
    if (amount > unpaid) {
      this.messages.add({
        severity: 'warn',
        summary: 'Commission',
        detail: `Le montant dépasse le dû (${unpaid} XOF)`,
      });
      return;
    }
    const raw = this.commissionForm.getRawValue();
    this.payingCommission.set(true);
    this.api
      .payCommission(this.commissionDistributor.id, {
        amount,
        paymentMethod: raw.paymentMethod,
        reference: raw.reference || undefined,
        note: raw.note || undefined,
      })
      .subscribe({
        next: (payout) => {
          this.payingCommission.set(false);
          this.commissionPayVisible = false;
          this.messages.add({
            severity: 'success',
            summary: 'Commission versée',
            detail: `${payout.amount} XOF — reste dû ${payout.unpaidAfter} XOF`,
          });
          this.reload();
        },
        error: (err) => {
          this.payingCommission.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'Commission',
            detail: apiErrorMessage(err, 'Versement impossible'),
          });
        },
      });
  }

  openCommissionHistory(d: Distributor): void {
    this.commissionDistributor = d;
    this.api.listCommissionPayouts(d.id).subscribe({
      next: (list) => {
        this.commissionPayouts.set(list);
        this.commissionHistoryVisible = true;
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Commission',
          detail: apiErrorMessage(err, 'Historique indisponible'),
        }),
    });
  }

  payoutMethodLabel(method: string): string {
    return this.commissionPaymentMethods.find((m) => m.value === method)?.label ?? method;
  }

  docTypeLabel(docType: string): string {
    return this.docTypes.find((d) => d.value === docType)?.label ?? docType;
  }

  openReview(d: Distributor): void {
    this.reviewDistributor = d;
    this.uploadDocType = 'OTHER';
    this.rejectReason = '';
    this.rejectVisible = false;
    this.reviewVisible = true;
    this.api.listAttachments(d.id).subscribe({
      next: (list) => this.attachments.set(list),
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Pièces jointes',
          detail: apiErrorMessage(err, 'Impossible de charger les pièces'),
        }),
    });
  }

  downloadAttachment(att: Attachment): void {
    if (!this.reviewDistributor) return;
    this.api.downloadAttachment(this.reviewDistributor.id, att.id, att.fileName).subscribe({
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Téléchargement',
          detail: apiErrorMessage(err, 'Téléchargement impossible'),
        }),
    });
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.reviewDistributor) return;
    this.uploadingAttachment.set(true);
    this.api.uploadAttachment(this.reviewDistributor.id, this.uploadDocType, file).subscribe({
      next: () => {
        this.uploadingAttachment.set(false);
        input.value = '';
        this.messages.add({
          severity: 'success',
          summary: 'Pièce jointe',
          detail: 'Fichier téléversé',
        });
        this.api.listAttachments(this.reviewDistributor!.id).subscribe((list) => this.attachments.set(list));
        this.reload();
      },
      error: (err) => {
        this.uploadingAttachment.set(false);
        input.value = '';
        this.messages.add({
          severity: 'error',
          summary: 'Pièce jointe',
          detail: apiErrorMessage(err, 'Téléversement impossible'),
        });
      },
    });
  }

  approveRegistration(): void {
    const d = this.reviewDistributor;
    if (!d) return;
    if (!this.canApprove(d)) {
      this.messages.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Les frais d’inscription doivent être payés avant approbation',
      });
      return;
    }
    this.reviewing.set(true);
    this.api.approve(d.id).subscribe({
      next: (updated) => {
        this.reviewing.set(false);
        this.reviewDistributor = updated;
        this.messages.add({
          severity: 'success',
          summary: 'Inscription',
          detail: 'Distributeur approuvé',
        });
        this.reviewVisible = false;
        this.reload();
      },
      error: (err) => {
        this.reviewing.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Inscription',
          detail: apiErrorMessage(err, 'Approbation impossible'),
        });
      },
    });
  }

  openReject(): void {
    this.rejectReason = '';
    this.rejectVisible = true;
  }

  confirmReject(): void {
    const d = this.reviewDistributor;
    const reason = this.rejectReason.trim();
    if (!d) return;
    if (!reason) {
      this.messages.add({
        severity: 'warn',
        summary: 'Rejet',
        detail: 'Indiquez un motif de rejet',
      });
      return;
    }
    this.reviewing.set(true);
    this.api.reject(d.id, { reason }).subscribe({
      next: (updated) => {
        this.reviewing.set(false);
        this.rejectVisible = false;
        this.reviewDistributor = updated;
        this.messages.add({
          severity: 'success',
          summary: 'Inscription',
          detail: 'Dossier rejeté',
        });
        this.reviewVisible = false;
        this.reload();
      },
      error: (err) => {
        this.reviewing.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Inscription',
          detail: apiErrorMessage(err, 'Rejet impossible'),
        });
      },
    });
  }

  deactivate(d: Distributor): void {
    const label = `${d.firstName ?? ''} ${d.lastName ?? d.name}`.trim() || d.code;
    if (!confirm(`Désactiver le distributeur ${label} ?\nIl ne pourra plus se connecter ni opérer.`)) return;
    this.api.deactivate(d.id).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Distributeur', detail: 'Désactivé' });
        this.reload();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Distributeur',
          detail: apiErrorMessage(err, 'Désactivation impossible'),
        }),
    });
  }

  private validationSummary(): string {
    const c = this.form.controls;
    const missing: string[] = [];
    if (c.code.invalid) missing.push('code');
    if (c.username.invalid) missing.push('login');
    if (c.firstName.invalid) missing.push('prénom');
    if (c.lastName.invalid) missing.push('nom');
    if (c.email.invalid) missing.push('email valide');
    if (c.phone.invalid) missing.push('téléphone (indicatif + numéro)');
    if (c.pin.invalid) {
      missing.push(this.editingId == null ? 'PIN (4–6 chiffres)' : 'PIN (4–6 chiffres ou vide)');
    }
    return missing.length
      ? `Champs à corriger : ${missing.join(', ')}`
      : 'Vérifiez les champs du formulaire';
  }

  remove(d: Distributor): void {
    const label = `${d.firstName ?? ''} ${d.lastName ?? d.name}`.trim() || d.code;
    if (
      !confirm(
        `Supprimer définitivement ${label} (${d.code}) ?\n` +
          `Le compte de connexion associé sera aussi supprimé.\n` +
          `Les transactions historiques sont conservées.`,
      )
    ) {
      return;
    }
    this.api.delete(d.id).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'Distributeur',
          detail: 'Compte supprimé',
        });
        this.reload();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Distributeur',
          detail: apiErrorMessage(err, 'Suppression impossible'),
        }),
    });
  }
}
