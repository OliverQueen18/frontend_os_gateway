import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

const STATUS_LABELS_FR: Record<string, string> = {
  PENDING: 'En attente',
  QUEUED: 'En file',
  ASSIGNED: 'Assignée',
  PROCESSING: 'En cours',
  WAITING_SMS_CONFIRMATION: 'Attente SMS',
  SUCCESS: 'Succès',
  FAILED: 'Échec',
  TIMEOUT: 'Expirée',
  CANCELLED: 'Annulée',
  ONLINE: 'En ligne',
  OFFLINE: 'Hors ligne',
  BUSY: 'Occupé',
  IDLE: 'Inactif',
  MAINTENANCE: 'Maintenance',
  DISABLED: 'Désactivé',
  ACTIVE: 'Actif',
  WARNING: 'Alerte',
  DELIVERED: 'Livré',
  SENT: 'Envoyé',
  SCHEDULED: 'Planifié',
  CRITICAL: 'Critique',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngClass]="toneClass">
      <span class="status-dot"></span>
      {{ displayLabel }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: string;
  @Input() label = '';

  get displayLabel(): string {
    if (this.label) return this.label;
    const key = (this.status || '').toUpperCase();
    return STATUS_LABELS_FR[key] ?? this.status;
  }

  get toneClass(): string {
    const s = (this.status || '').toUpperCase();
    if (['ONLINE', 'SUCCESS', 'DELIVERED', 'ACTIVE', 'IDLE'].includes(s)) return 'tone-ok';
    if (
      ['BUSY', 'PROCESSING', 'WAITING_SMS_CONFIRMATION', 'QUEUED', 'PENDING', 'ASSIGNED', 'SENT', 'SCHEDULED', 'WARNING'].includes(
        s,
      )
    ) {
      return 'tone-warn';
    }
    if (['OFFLINE', 'FAILED', 'TIMEOUT', 'CRITICAL', 'CANCELLED', 'DISABLED'].includes(s))
      return 'tone-danger';
    if (['MAINTENANCE'].includes(s)) return 'tone-warn';
    return 'tone-muted';
  }
}
