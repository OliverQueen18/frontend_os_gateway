import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TabsModule } from 'primeng/tabs';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import { PhoneInputComponent } from '../../shared/components/phone-input';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { SmsService } from '../../core/services/sms.service';
import { SmsMessage } from '../../core/models/sms.models';
import { PageResponse } from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { matchesSearch } from '../../core/utils/text-search';

@Component({
  selector: 'app-sms',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TabsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    TableModule,
    DatePickerModule,
    ToastModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    PhoneInputComponent,
    RelativeTimePipe,
  ],
  providers: [MessageService],
  templateUrl: './sms.html',
})
export class SmsPage implements OnInit {
  private readonly api = inject(SmsService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);

  readonly history = signal<SmsMessage[]>([]);
  activeTab = '0';
  search = '';

  filteredHistory(): SmsMessage[] {
    return this.history().filter((m) =>
      matchesSearch(this.search, m.to, m.body, m.status, m.operator),
    );
  }

  readonly sendForm = this.fb.nonNullable.group({
    to: ['', Validators.required],
    body: ['', [Validators.required, Validators.maxLength(480)]],
    operator: [''],
  });

  readonly bulkForm = this.fb.nonNullable.group({
    recipients: ['', Validators.required],
    body: ['', Validators.required],
  });

  readonly scheduleForm = this.fb.nonNullable.group({
    to: ['', Validators.required],
    body: ['', Validators.required],
    scheduledAt: [null as Date | null, Validators.required],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.history().subscribe((res) => {
      const items = Array.isArray(res) ? res : (res as PageResponse<SmsMessage>).content;
      this.history.set(items);
    });
  }

  send(): void {
    if (this.sendForm.invalid) return;
    this.api.send(this.sendForm.getRawValue()).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'SMS', detail: 'Message mis en file' });
        this.sendForm.reset({ to: '', body: '', operator: '' });
        this.reload();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'SMS',
          detail: apiErrorMessage(err, 'Envoi impossible'),
        }),
    });
  }

  sendBulk(): void {
    if (this.bulkForm.invalid) return;
    const recipients = this.bulkForm.controls.recipients.value
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    this.api.bulk({ recipients, body: this.bulkForm.controls.body.value }).subscribe({
      next: (r) => {
        this.messages.add({
          severity: 'success',
          summary: 'Bulk SMS',
          detail: `${r.queued} messages en file`,
        });
        this.reload();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Bulk SMS',
          detail: apiErrorMessage(err, 'Envoi impossible'),
        }),
    });
  }

  schedule(): void {
    if (this.scheduleForm.invalid) return;
    const v = this.scheduleForm.getRawValue();
    this.api
      .schedule({
        to: v.to,
        body: v.body,
        scheduledAt: (v.scheduledAt as Date).toISOString(),
      })
      .subscribe({
        next: () => {
          this.messages.add({ severity: 'success', summary: 'Planifié', detail: 'SMS programmé' });
          this.reload();
        },
        error: (err) =>
          this.messages.add({
            severity: 'error',
            summary: 'Planifié',
            detail: apiErrorMessage(err, 'Planification impossible'),
          }),
      });
  }
}
