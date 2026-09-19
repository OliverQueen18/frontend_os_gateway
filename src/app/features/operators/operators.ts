import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import { OperatorService } from '../../core/services/operator.service';
import { OperationTypeService } from '../../core/services/operation-type.service';
import { Operator, OperationType, BalancePattern, UssdStep, UssdTemplate } from '../../core/models/user.models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { matchesSearch } from '../../core/utils/text-search';

@Component({
  selector: 'app-operators',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToggleSwitchModule,
    ToastModule,
    TooltipModule,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  providers: [MessageService],
  templateUrl: './operators.html',
})
export class OperatorsPage implements OnInit {
  private readonly api = inject(OperatorService);
  private readonly opsApi = inject(OperationTypeService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);

  readonly operators = signal<Operator[]>([]);
  readonly templates = signal<UssdTemplate[]>([]);
  readonly balancePatterns = signal<BalancePattern[]>([]);
  balancePatternsVisible = false;
  balancePatternSaving = false;
  readonly operationTypes = signal<OperationType[]>([]);
  templatesVisible = false;
  formVisible = false;
  templateFormVisible = false;
  savingTemplate = false;
  search = '';

  filteredOperators(): Operator[] {
    return this.operators().filter((op) => matchesSearch(this.search, op.code, op.name));
  }
  editingId: number | null = null;
  editingTemplateId: number | null = null;
  selectedOperator: Operator | null = null;
  pendingLogoFile: File | null = null;
  logoPreview: string | null = null;

  get txTypes(): Array<{ label: string; value: string }> {
    return this.operationTypes()
      .filter((t) => t.active !== false)
      .map((t) => ({ label: t.label || t.code, value: t.code }));
  }

  readonly stepActions = [
    { label: 'Composer le code USSD', value: 'COMPOSE', short: 'Composer' },
    { label: 'Répondre (saisie clavier)', value: 'REPLY', short: 'Répondre' },
    { label: 'Attendre l’écran', value: 'WAIT', short: 'Attendre' },
    { label: 'Lire / attendre un motif', value: 'READ', short: 'Lire' },
    { label: 'Valider / fermer dialogue (OK ou Annuler)', value: 'CONTINUE', short: 'Fermer' },
    { label: 'Vérifier le succès (écran USSD)', value: 'VALIDATE', short: 'Vérifier' },
    { label: 'Extraire une variable', value: 'EXTRACT', short: 'Extraire' },
    { label: 'Attendre SMS de confirmation', value: 'WAIT_SMS', short: 'SMS' },
    { label: 'Exécuter un autre modèle', value: 'RUN_TEMPLATE', short: 'Modèle' },
    { label: 'Vérifier le solde (avant/après)', value: 'VERIFY_BALANCE', short: 'Vérif. solde' },
  ];

  readonly exprPlaceholder = 'ex. {{phone}} ou *144*1*…';
  readonly smsFailPlaceholder =
    'Motif échec SMS — ex. echec|échec|insuffisant|incorrect|refus|annul|impossible';
  readonly smsSuccessPlaceholder =
    'Motif succès SMS — ex. retrait.*(effectue|effectué|succes|succès|reussi|réussi)';
  readonly phoneConfirmTip = 'Ajoute une étape « Répondre » avec {{phone}}';
  readonly smsConfirmTip =
    'Attend le SMS opérateur sur le gateway (120s). confirmationType=SMS. Corrélation montant + n° client.';
  readonly varPhone = '{{phone}}';
  readonly varAmount = '{{amount}}';
  readonly varPin = '{{pin}}';
  readonly runTemplateCaptureVars = [
    { label: 'Solde avant (gateway_balance_before)', value: 'gateway_balance_before' },
    { label: 'Solde après (gateway_balance_after)', value: 'gateway_balance_after' },
    { label: 'mm_balance', value: 'mm_balance' },
  ];

  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    logoUrl: [''],
    active: [true],
  });

  readonly templateForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    transactionType: ['', Validators.required],
    description: [''],
    active: [true],
    steps: this.fb.array<ReturnType<OperatorsPage['newStepGroup']>>([]),
  });

  get steps(): FormArray<ReturnType<OperatorsPage['newStepGroup']>> {
    return this.templateForm.controls.steps;
  }

  ngOnInit(): void {
    this.reload();
    this.opsApi.list(true).subscribe({
      next: (list) => {
        this.operationTypes.set(list ?? []);
        const current = this.templateForm.controls.transactionType.value;
        if (!current && this.txTypes.length > 0) {
          this.templateForm.controls.transactionType.setValue(this.txTypes[0].value, {
            emitEvent: false,
          });
        }
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Types d’opérations',
          detail: apiErrorMessage(err, 'Impossible de charger les types d’opérations'),
        }),
    });
  }

  reload(): void {
    this.api.list().subscribe({
      next: (list) => this.operators.set(list ?? []),
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Opérateurs',
          detail: apiErrorMessage(err, 'Impossible de charger les opérateurs'),
        }),
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.pendingLogoFile = null;
    this.logoPreview = null;
    this.form.reset({ code: '', name: '', logoUrl: '', active: true });
    this.form.controls.code.enable();
    this.formVisible = true;
  }

  openEdit(op: Operator): void {
    this.editingId = op.id;
    this.pendingLogoFile = null;
    this.logoPreview = this.logoSrc(op);
    this.form.reset({ code: op.code, name: op.name, logoUrl: op.logoUrl ?? '', active: op.active });
    this.form.controls.code.disable();
    this.formVisible = true;
  }

  logoSrc(op: Operator): string | null {
    return this.api.logoSrc(op);
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pendingLogoFile = file;
    if (file) {
      this.logoPreview = URL.createObjectURL(file);
    }
  }

  saveOperator(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      code: raw.code,
      name: raw.name,
      active: raw.active,
      logoUrl: raw.logoUrl?.trim() || null,
    };
    const req$ =
      this.editingId == null ? this.api.create(payload) : this.api.update(this.editingId, payload);
    req$.subscribe({
      next: (saved) => {
        const id = saved?.id ?? this.editingId;
        if (id != null && this.pendingLogoFile) {
          this.api.uploadLogo(id, this.pendingLogoFile).subscribe({
            next: () => this.afterOperatorSaved(),
            error: (err) =>
              this.messages.add({
                severity: 'error',
                summary: 'Logo',
                detail: apiErrorMessage(err, 'Opérateur enregistré mais logo non uploadé'),
              }),
          });
        } else {
          this.afterOperatorSaved();
        }
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Opérateur',
          detail: apiErrorMessage(err, 'Échec de l’enregistrement'),
        }),
    });
  }

  private afterOperatorSaved(): void {
    this.formVisible = false;
    this.pendingLogoFile = null;
    this.logoPreview = null;
    this.messages.add({
      severity: 'success',
      summary: 'Opérateur',
      detail: this.editingId == null ? 'Créé' : 'Mis à jour',
    });
    this.reload();
  }

  remove(op: Operator): void {
    if (
      !confirm(
        `Supprimer définitivement l’opérateur ${op.code} (${op.name}) ?\n` +
          `Les modèles USSD associés seront aussi supprimés.`,
      )
    ) {
      return;
    }
    this.api.delete(op.id).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Opérateur', detail: 'Supprimé' });
        if (this.selectedOperator?.id === op.id) {
          this.selectedOperator = null;
          this.templatesVisible = false;
          this.templates.set([]);
        }
        this.reload();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Opérateur',
          detail: apiErrorMessage(err, 'Suppression impossible'),
        }),
    });
  }

  openTemplates(op: Operator): void {
    this.selectedOperator = op;
    this.api.templates(op.code, op.id).subscribe({
      next: (t) => {
        this.templates.set(t);
        this.templatesVisible = true;
      },
      error: (err) => {
        this.templatesVisible = true;
        this.messages.add({
          severity: 'error',
          summary: 'Modèles USSD',
          detail: apiErrorMessage(err, 'Impossible de charger les modèles'),
        });
      },
    });
  }

  openBalancePatterns(op: Operator): void {
    this.selectedOperator = op;
    this.api.balancePatterns(op.id).subscribe({
      next: (rows) => {
        this.balancePatterns.set(rows ?? []);
        this.balancePatternsVisible = true;
      },
      error: (err) => {
        this.balancePatternsVisible = true;
        this.balancePatterns.set([]);
        this.messages.add({
          severity: 'error',
          summary: 'Motifs solde',
          detail: apiErrorMessage(err, 'Impossible de charger les motifs'),
        });
      },
    });
  }

  addBalancePattern(): void {
    this.balancePatterns.update((rows) => [
      ...rows,
      {
        fieldType: 'PRINCIPAL',
        regexPattern: '',
        priority: 10,
        active: true,
        description: '',
      },
    ]);
  }

  removeBalancePattern(index: number): void {
    this.balancePatterns.update((rows) => rows.filter((_, i) => i !== index));
  }

  saveBalancePatterns(): void {
    const op = this.selectedOperator;
    if (!op) return;
    const rows = this.balancePatterns().filter((r) => r.regexPattern?.trim());
    this.balancePatternSaving = true;
    this.api.saveBalancePatterns(op.id, rows).subscribe({
      next: (saved) => {
        this.balancePatterns.set(saved);
        this.balancePatternSaving = false;
        this.messages.add({
          severity: 'success',
          summary: 'Motifs solde',
          detail: 'Motifs enregistrés',
        });
      },
      error: (err) => {
        this.balancePatternSaving = false;
        this.messages.add({
          severity: 'error',
          summary: 'Motifs solde',
          detail: apiErrorMessage(err, 'Enregistrement impossible'),
        });
      },
    });
  }

  openCreateTemplate(): void {
    if (!this.selectedOperator) return;
    this.editingTemplateId = null;
    const defaultType = this.txTypes[0]?.value ?? '';
    this.templateForm.patchValue(
      {
        name: '',
        transactionType: defaultType,
        description: '',
        active: true,
      },
      { emitEvent: false },
    );
    this.resetSteps([
      this.newStepGroup('COMPOSE', '*144*#'),
      this.newStepGroup('WAIT', '', null, 2000),
      this.newStepGroup('REPLY', '{{phone}}'),
      this.newStepGroup('REPLY', '{{amount}}'),
      this.newStepGroup('REPLY', '{{pin}}'),
      this.newStepGroup('VALIDATE', '', 'succes|reussi|OK'),
    ]);
    this.templateFormVisible = true;
  }

  openEditTemplate(t: UssdTemplate): void {
    this.editingTemplateId = t.id;
    const code = (t.transactionType || '').trim().toUpperCase();
    const known = this.operationTypes().some((o) => o.code.toUpperCase() === code);
    this.templateForm.patchValue(
      {
        name: t.name,
        transactionType: known ? code : code || this.txTypes[0]?.value || '',
        description: t.description ?? '',
        active: t.active ?? true,
      },
      { emitEvent: false },
    );
    const steps = t.steps?.length
      ? t.steps.map((s) =>
          this.newStepGroup(
            s.action || 'COMPOSE',
            s.expression ?? '',
            s.expectedPattern ?? null,
            s.waitMillis ?? null,
            s.extractVar ?? null,
          ),
        )
      : [this.newStepGroup('COMPOSE', t.template ?? '')];
    this.resetSteps(steps);
    this.templateFormVisible = true;
  }

  addStep(action = 'REPLY', expression = ''): void {
    this.steps.push(this.newStepGroup(action, expression));
  }

  addPhoneConfirmStep(): void {
    this.steps.push(this.newStepGroup('REPLY', '{{phone}}'));
    this.messages.add({
      severity: 'info',
      summary: 'Étape ajoutée',
      detail: 'Confirmation téléphone (réponse {{phone}})',
      life: 2500,
    });
  }

  addSmsConfirmStep(): void {
    this.steps.push(
      this.newStepGroup(
        'WAIT_SMS',
        'echec|échec|echoue|échoué|insuffisant|incorrect|refus|annul|impossible',
        'retrait.*(effectue|effectué|succes|succès|reussi|réussi)',
        120_000,
      ),
    );
    this.messages.add({
      severity: 'info',
      summary: 'Étape ajoutée',
      detail: 'Attente SMS de confirmation (120s) — source de vérité finale',
      life: 3000,
    });
  }

  /** Ferme le dialogue USSD final (OK si succès, Annuler si solde insuffisant / échec). */
  addDismissDialogStep(): void {
    this.steps.push(
      this.newStepGroup(
        'CONTINUE',
        'OK',
        'retrait|effectu|secret|sms|confirm|OK|Annuler|insuffisant|solde|succès|reussi|échou|echec',
        30_000,
      ),
    );
    this.messages.add({
      severity: 'info',
      summary: 'Étape ajoutée',
      detail: 'Fermeture dialogue final (clic OK ou Annuler)',
      life: 3000,
    });
  }

  addPinStep(): void {
    this.steps.push(this.newStepGroup('REPLY', '{{pin}}'));
  }

  addAmountStep(): void {
    this.steps.push(this.newStepGroup('REPLY', '{{amount}}'));
  }

  addRunTemplateStep(extractVar: 'gateway_balance_before' | 'gateway_balance_after' = 'gateway_balance_before'): void {
    const target = this.callableTemplateTypes()[0]?.value || 'SOLDE';
    this.steps.push(this.newStepGroup('RUN_TEMPLATE', target, null, null, extractVar));
    this.messages.add({
      severity: 'info',
      summary: 'Étape ajoutée',
      detail:
        extractVar === 'gateway_balance_before'
          ? 'Exécute le modèle SOLDE et enregistre le solde avant'
          : 'Exécute le modèle SOLDE et enregistre le solde après',
      life: 3000,
    });
  }

  addVerifyBalanceStep(): void {
    this.steps.push(this.newStepGroup('VERIFY_BALANCE'));
    this.messages.add({
      severity: 'info',
      summary: 'Étape ajoutée',
      detail: 'Compare solde avant/après au montant (confirme ou infirme)',
      life: 3000,
    });
  }

  callableTemplateTypes(): Array<{ label: string; value: string }> {
    const current = (this.templateForm.controls.transactionType.value || '').trim().toUpperCase();
    const fromLoaded = this.templates()
      .filter((t) => (t.transactionType || '').trim().toUpperCase() && (t.transactionType || '').toUpperCase() !== current)
      .map((t) => ({
        label: `${t.name} (${t.transactionType})`,
        value: (t.transactionType || '').toUpperCase(),
      }));
    const seen = new Set<string>();
    const unique = fromLoaded.filter((x) => {
      if (seen.has(x.value)) return false;
      seen.add(x.value);
      return true;
    });
    if (unique.length > 0) return unique;
    return this.txTypes.filter((t) => t.value.toUpperCase() !== current);
  }

  stepExprPlaceholder(action: string): string {
    if (action === 'WAIT_SMS') return this.smsFailPlaceholder;
    if (action === 'CONTINUE') return 'Bouton (optionnel) — OK ou Annuler ; vide = auto';
    if (action === 'RUN_TEMPLATE') return 'SOLDE';
    return this.exprPlaceholder;
  }

  stepPatternPlaceholder(action: string): string {
    if (action === 'WAIT_SMS') return this.smsSuccessPlaceholder;
    if (action === 'CONTINUE') return 'Texte écran — ex. retrait|effectu|secret|OK|Annuler';
    if (action === 'RUN_TEMPLATE') return '—';
    return 'Optionnel';
  }

  stepWaitPlaceholder(action: string): string {
    if (action === 'WAIT_SMS') return '120000';
    if (action === 'CONTINUE') return '30000';
    if (action === 'REPLY' || action === 'WAIT') return '25000';
    if (action === 'RUN_TEMPLATE' || action === 'VERIFY_BALANCE') return '—';
    return '2000';
  }

  stepExprLabel(action: string): string {
    if (action === 'WAIT_SMS') return 'Motif échec SMS';
    if (action === 'CONTINUE') return 'Bouton à cliquer';
    if (action === 'RUN_TEMPLATE') return 'Modèle à exécuter';
    if (action === 'VERIFY_BALANCE') return '—';
    return 'Expression / valeur';
  }

  stepPatternLabel(action: string): string {
    if (action === 'WAIT_SMS') return 'Motif succès SMS';
    if (action === 'CONTINUE') return 'Motif de l’écran';
    if (action === 'RUN_TEMPLATE') return '—';
    return 'Motif attendu';
  }

  /** Clé stable pour @for (évite le bug track $index au move/delete). */
  stepTrackKey(ctrl: ReturnType<OperatorsPage['newStepGroup']>): number {
    return ctrl.controls._key.value;
  }

  removeStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;
    if (this.steps.length <= 1) return;
    this.steps.removeAt(index);
  }

  moveStep(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.steps.length) return;
    const current = this.steps.at(index);
    const neighbor = this.steps.at(target);
    this.steps.setControl(index, neighbor);
    this.steps.setControl(target, current);
    this.steps.markAsDirty();
    this.steps.updateValueAndValidity({ emitEvent: false });
  }

  saveTemplate(): void {
    if (this.savingTemplate) return;
    if (!this.selectedOperator || this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      this.messages.add({
        severity: 'warn',
        summary: 'Modèle USSD',
        detail: 'Complétez les champs obligatoires (nom, type, action de chaque étape).',
      });
      return;
    }
    if (this.steps.length === 0) {
      this.messages.add({
        severity: 'warn',
        summary: 'Modèle USSD',
        detail: 'Ajoutez au moins une étape',
      });
      return;
    }
    const raw = this.templateForm.getRawValue();
    const steps: UssdStep[] = raw.steps.map((s, i) => {
      const waitRaw = s.waitMillis;
      const wait =
        waitRaw === null || waitRaw === undefined || (waitRaw as unknown) === ''
          ? null
          : Number(waitRaw);
      return {
        stepOrder: i + 1,
        action: s.action,
        expression: s.expression?.trim() || null,
        expectedPattern: s.expectedPattern?.trim() || null,
        extractVar: s.extractVar?.trim() || null,
        waitMillis: wait != null && !Number.isNaN(wait) ? wait : null,
      };
    });
    const operator = this.selectedOperator;
    const creating = this.editingTemplateId == null;
    const payload = {
      operatorId: operator.id,
      operatorCode: operator.code,
      transactionType: raw.transactionType,
      name: raw.name,
      description: raw.description,
      active: raw.active,
      steps,
    };
    this.savingTemplate = true;
    const req$ = creating
      ? this.api.createTemplate(payload)
      : this.api.updateTemplate(this.editingTemplateId!, payload);
    req$.subscribe({
      next: (saved) => {
        this.savingTemplate = false;
        this.templateFormVisible = false;
        this.upsertLocalTemplate(saved);
        this.messages.add({
          severity: 'success',
          summary: 'Modèle USSD',
          detail: creating ? 'Créé' : 'Mis à jour',
        });
        this.api.templates(operator.code, operator.id).subscribe({
          next: (list) => this.templates.set(list),
          error: (err) =>
            this.messages.add({
              severity: 'warn',
              summary: 'Modèle USSD',
              detail: apiErrorMessage(err, 'Enregistré, mais la liste n’a pas pu être rechargée'),
            }),
        });
      },
      error: (err) => {
        this.savingTemplate = false;
        this.messages.add({
          severity: 'error',
          summary: 'Modèle USSD',
          detail: apiErrorMessage(err, 'Échec de l’enregistrement'),
        });
      },
    });
  }

  removeTemplate(t: UssdTemplate): void {
    if (!confirm(`Supprimer le modèle « ${t.name} » ?`)) return;
    this.api.deleteTemplate(t.id).subscribe({
      next: () => this.openTemplates(this.selectedOperator!),
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Modèle USSD',
          detail: apiErrorMessage(err, 'Suppression impossible'),
        }),
    });
  }

  stepLabel(action: string): string {
    return this.stepActions.find((a) => a.value === action)?.short ?? action;
  }

  txTypeLabel(type?: string | null): string {
    if (!type) return '';
    const code = type.trim().toUpperCase();
    const fromEntity = this.operationTypes().find((t) => t.code.toUpperCase() === code);
    if (fromEntity?.label) return fromEntity.label;
    return this.txTypes.find((t) => t.value.toUpperCase() === code)?.label ?? type;
  }

  /** Options select : inclut le type courant même s’il est inactif (édition). */
  typeChoicesForForm(): Array<{ label: string; value: string }> {
    const choices = [...this.txTypes];
    const current = (this.templateForm.controls.transactionType.value || '').trim().toUpperCase();
    if (current && !choices.some((c) => c.value.toUpperCase() === current)) {
      const op = this.operationTypes().find((t) => t.code.toUpperCase() === current);
      choices.unshift({
        label: op?.label || current,
        value: op?.code || current,
      });
    }
    return choices;
  }

  private nextStepKey = 1;

  private newStepGroup(
    action: string,
    expression = '',
    expectedPattern: string | null = null,
    waitMillis: number | null = null,
    extractVar: string | null = null,
  ) {
    return this.fb.nonNullable.group({
      _key: [this.nextStepKey++],
      action: [action, Validators.required],
      expression: [expression],
      expectedPattern: [expectedPattern ?? ''],
      extractVar: [extractVar ?? ''],
      waitMillis: [waitMillis as number | null],
    });
  }

  private resetSteps(groups: ReturnType<OperatorsPage['newStepGroup']>[]): void {
    this.steps.clear();
    for (const g of groups) {
      this.steps.push(g);
    }
  }

  private upsertLocalTemplate(saved: UssdTemplate): void {
    if (!saved?.id) {
      return;
    }
    const current = this.templates();
    const idx = current.findIndex((t) => t.id === saved.id);
    if (idx >= 0) {
      const next = [...current];
      next[idx] = saved;
      this.templates.set(next);
    } else {
      this.templates.set([...current, saved]);
    }
  }
}
