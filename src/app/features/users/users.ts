import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import { PhoneInputComponent } from '../../shared/components/phone-input';
import { UserService } from '../../core/services/user.service';
import { Role, User } from '../../core/models/user.models';
import { formatRoleList, roleLabel } from '../../core/utils/rbac-labels';
import { apiErrorMessage } from '../../core/utils/api-error';
import { matchesSearch } from '../../core/utils/text-search';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    ToggleSwitchModule,
    MultiSelectModule,
    ToastModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    PhoneInputComponent,
  ],
  providers: [MessageService],
  templateUrl: './users.html',
})
export class UsersPage implements OnInit {
  private readonly api = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);

  readonly users = signal<User[]>([]);
  readonly roleOptions = signal<Array<{ label: string; value: string }>>([]);
  readonly saving = signal(false);
  visible = false;
  editingId: number | null = null;
  search = '';

  filteredUsers(): User[] {
    return this.users().filter((u) =>
      matchesSearch(this.search, u.username, u.email, u.fullName, u.phone, ...(u.roles ?? [])),
    );
  }

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    fullName: [''],
    phone: [''],
    password: [''],
    enabled: [true],
    roles: [[] as string[]],
  });

  readonly formatRoleList = formatRoleList;

  ngOnInit(): void {
    this.api.roles().subscribe((roles: Role[]) => {
      this.roleOptions.set(roles.map((r) => ({ label: roleLabel(r.name), value: r.name })));
    });
    this.reload();
  }

  reload(): void {
    this.api.list(this.search.trim() || undefined).subscribe((page) => this.users.set(page.content));
  }

  openCreate(): void {
    this.editingId = null;
    const defaultRole = this.roleOptions()[0]?.value ?? 'OPERATOR';
    this.form.reset({
      username: '',
      email: '',
      fullName: '',
      phone: '',
      password: '',
      enabled: true,
      roles: [defaultRole],
    });
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
    this.visible = true;
  }

  openEdit(user: User): void {
    this.editingId = user.id;
    this.form.patchValue({
      username: user.username,
      email: user.email,
      fullName: user.fullName ?? '',
      phone: user.phone ?? '',
      password: '',
      enabled: user.enabled,
      roles: user.roles,
    });
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.visible = true;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      username: raw.username,
      email: raw.email,
      fullName: raw.fullName || undefined,
      phone: raw.phone || undefined,
      enabled: raw.enabled,
      roles: raw.roles,
      ...(raw.password ? { password: raw.password } : {}),
    };
    const req$ =
      this.editingId == null
        ? this.api.create(payload)
        : this.api.update(this.editingId, payload);
    this.saving.set(true);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.visible = false;
        this.messages.add({
          severity: 'success',
          summary: 'Utilisateur',
          detail: this.editingId == null ? 'Créé' : 'Mis à jour',
        });
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Utilisateur',
          detail: apiErrorMessage(err, 'Échec de l’enregistrement'),
        });
      },
    });
  }

  remove(user: User): void {
    if (!confirm(`Supprimer ${user.username} ?`)) return;
    this.api.delete(user.id).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Utilisateur', detail: 'Supprimé' });
        this.reload();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Utilisateur',
          detail: apiErrorMessage(err, 'Suppression impossible'),
        }),
    });
  }
}
