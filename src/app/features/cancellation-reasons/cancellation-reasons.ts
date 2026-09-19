import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import {
  CancellationReason,
  CancellationReasonService,
} from '../../core/services/cancellation-reason.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { matchesSearch } from '../../core/utils/text-search';

@Component({
  selector: 'app-cancellation-reasons',
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
    ToggleSwitchModule,
    ToastModule,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  providers: [MessageService],
  templateUrl: './cancellation-reasons.html',
})
export class CancellationReasonsPage implements OnInit {
  private readonly api = inject(CancellationReasonService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);

  readonly rows = signal<CancellationReason[]>([]);
  dialogVisible = false;
  editingId: number | null = null;
  search = '';

  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    label: ['', Validators.required],
    description: [''],
    active: [true],
  });

  ngOnInit(): void {
    this.reload();
  }

  filtered(): CancellationReason[] {
    return this.rows().filter((r) =>
      matchesSearch(this.search, r.code, r.label, r.description),
    );
  }

  reload(): void {
    this.api.list(false).subscribe({
      next: (list) => this.rows.set(list ?? []),
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Motifs',
          detail: apiErrorMessage(err, 'Impossible de charger les motifs'),
        }),
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form.reset({ code: '', label: '', description: '', active: true });
    this.dialogVisible = true;
  }

  openEdit(row: CancellationReason): void {
    this.editingId = row.id;
    this.form.reset({
      code: row.code,
      label: row.label,
      description: row.description ?? '',
      active: row.active !== false,
    });
    this.dialogVisible = true;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messages.add({
        severity: 'warn',
        summary: 'Motifs',
        detail: 'Code et libellé obligatoires',
      });
      return;
    }
    const raw = this.form.getRawValue();
    const body = {
      code: raw.code.trim(),
      label: raw.label.trim(),
      description: raw.description.trim() || null,
      active: raw.active,
    };
    const req$ =
      this.editingId == null
        ? this.api.create(body)
        : this.api.update(this.editingId, body);
    req$.subscribe({
      next: () => {
        this.dialogVisible = false;
        this.messages.add({
          severity: 'success',
          summary: 'Motifs',
          detail: this.editingId == null ? 'Motif créé' : 'Motif mis à jour',
        });
        this.reload();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Motifs',
          detail: apiErrorMessage(err, 'Enregistrement impossible'),
        }),
    });
  }

  remove(row: CancellationReason): void {
    if (!confirm(`Supprimer le motif « ${row.label} » ?`)) return;
    this.api.delete(row.id).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Motifs', detail: 'Motif supprimé' });
        this.reload();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Motifs',
          detail: apiErrorMessage(err, 'Suppression impossible (motif peut-être utilisé)'),
        }),
    });
  }
}
