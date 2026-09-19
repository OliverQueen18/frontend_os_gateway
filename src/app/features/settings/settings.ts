import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { UserService } from '../../core/services/user.service';
import { SettingItem } from '../../core/models/user.models';
import { apiErrorMessage } from '../../core/utils/api-error';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    TextareaModule,
    ToggleSwitchModule,
    InputNumberModule,
    ButtonModule,
    ToastModule,
    PageHeaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './settings.html',
})
export class SettingsPage implements OnInit {
  private readonly messages = inject(MessageService);
  private readonly api = inject(UserService);
  readonly saving = signal(false);

  settings = {
    orgName: 'OS Gateway',
    timezone: 'Africa/Bamako',
    heartbeatTimeoutSec: 90,
    lowBatteryThreshold: 25,
    enableRealtime: true,
    enableEmailAlerts: true,
    defaultCurrency: 'XOF',
    distributorRegistrationFee: 25000,
    distributorRegistrationTerms: '',
  };

  ngOnInit(): void {
    this.api.listSettings().subscribe((items) => this.applySettings(items));
  }

  save(): void {
    this.saving.set(true);
    const payload: SettingItem[] = [
      { key: 'org.name', value: this.settings.orgName, description: 'Organisation name' },
      { key: 'org.timezone', value: this.settings.timezone, description: 'Default timezone' },
      { key: 'org.currency', value: this.settings.defaultCurrency, description: 'Default currency' },
      {
        key: 'heartbeat.interval.seconds',
        value: String(this.settings.heartbeatTimeoutSec),
        description: 'Expected gateway heartbeat interval',
      },
      {
        key: 'gateway.min.battery',
        value: String(this.settings.lowBatteryThreshold),
        description: 'Minimum battery for selection',
      },
      {
        key: 'realtime.enabled',
        value: String(this.settings.enableRealtime),
        description: 'Enable realtime polling',
      },
      {
        key: 'alerts.email.enabled',
        value: String(this.settings.enableEmailAlerts),
        description: 'Enable email alerts',
      },
      {
        key: 'distributor.registration.fee',
        value: String(this.settings.distributorRegistrationFee),
        description: 'Distributor registration fee (XOF)',
      },
      {
        key: 'distributor.registration.terms',
        value: this.settings.distributorRegistrationTerms,
        description: "Conditions d'utilisation affichées à l'inscription distributeur",
      },
    ];
    this.api.saveSettings(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Paramètres',
          detail: 'Configuration enregistrée',
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Paramètres',
          detail: apiErrorMessage(err, 'Échec de l’enregistrement'),
        });
      },
    });
  }

  private applySettings(items: SettingItem[]): void {
    const map = new Map(items.map((i) => [i.key, i.value]));
    this.settings.orgName = map.get('org.name') ?? this.settings.orgName;
    this.settings.timezone = map.get('org.timezone') ?? this.settings.timezone;
    this.settings.defaultCurrency = map.get('org.currency') ?? this.settings.defaultCurrency;
    this.settings.heartbeatTimeoutSec = Number(
      map.get('heartbeat.interval.seconds') ?? this.settings.heartbeatTimeoutSec,
    );
    this.settings.lowBatteryThreshold = Number(
      map.get('gateway.min.battery') ?? this.settings.lowBatteryThreshold,
    );
    this.settings.enableRealtime = (map.get('realtime.enabled') ?? 'true') === 'true';
    this.settings.enableEmailAlerts = (map.get('alerts.email.enabled') ?? 'true') === 'true';
    this.settings.distributorRegistrationFee = Number(
      map.get('distributor.registration.fee') ?? this.settings.distributorRegistrationFee,
    );
    this.settings.distributorRegistrationTerms =
      map.get('distributor.registration.terms') ?? this.settings.distributorRegistrationTerms;
  }
}
