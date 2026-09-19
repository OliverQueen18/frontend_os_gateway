import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { UserService } from '../../core/services/user.service';
import { Permission, Role } from '../../core/models/user.models';
import {
  formatPermissionList,
  permissionLabel,
  roleLabel,
} from '../../core/utils/rbac-labels';
import { apiErrorMessage } from '../../core/utils/api-error';
import { matchesSearch } from '../../core/utils/text-search';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MultiSelectModule,
    ToastModule,
    PageHeaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './admin.html',
})
export class AdminPage implements OnInit {
  private readonly users = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);

  readonly roles = signal<Role[]>([]);
  readonly permissions = signal<Permission[]>([]);
  readonly permissionOptions = signal<Array<{ label: string; value: string }>>([]);
  roleVisible = false;
  permVisible = false;
  editingRoleId: number | null = null;
  editingPermId: number | null = null;
  roleSearch = '';
  permSearch = '';

  filteredRoles(): Role[] {
    return this.roles().filter((r) =>
      matchesSearch(this.roleSearch, r.name, r.description, ...(r.permissions ?? [])),
    );
  }

  filteredPermissions(): Permission[] {
    return this.permissions().filter((p) =>
      matchesSearch(this.permSearch, p.code, p.description),
    );
  }

  readonly roleForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    permissions: [[] as string[]],
  });

  readonly permForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    this.reloadRoles();
    this.reloadPermissions();
  }

  reloadRoles(): void {
    this.users.roles().subscribe((r) => this.roles.set(r));
  }

  reloadPermissions(): void {
    this.users.permissions().subscribe((list) => {
      this.permissions.set(list);
      this.permissionOptions.set(
        list.map((p) => ({
          label: permissionLabel(p.code, p.description),
          value: p.code,
        })),
      );
    });
  }

  roleLabel = roleLabel;
  permissionLabel = permissionLabel;
  formatPermissionList = formatPermissionList;

  openCreateRole(): void {
    this.editingRoleId = null;
    this.roleForm.reset({ name: '', description: '', permissions: [] });
    this.roleVisible = true;
  }

  openEditRole(role: Role): void {
    this.editingRoleId = role.id;
    this.roleForm.reset({
      name: role.name,
      description: role.description ?? '',
      permissions: [...(role.permissions ?? [])],
    });
    this.roleVisible = true;
  }

  saveRole(): void {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }
    const raw = this.roleForm.getRawValue();
    const req$ =
      this.editingRoleId == null
        ? this.users.createRole(raw)
        : this.users.updateRole(this.editingRoleId, raw);
    req$.subscribe({
      next: () => {
        this.roleVisible = false;
        this.messages.add({
          severity: 'success',
          summary: 'Rôle',
          detail: this.editingRoleId == null ? 'Créé' : 'Mis à jour',
        });
        this.reloadRoles();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Rôle',
          detail: apiErrorMessage(err, 'Échec de l’enregistrement'),
        }),
    });
  }

  removeRole(role: Role): void {
    if (role.name === 'ADMIN') return;
    if (!confirm(`Supprimer le rôle ${role.name} ?`)) return;
    this.users.deleteRole(role.id).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Rôle', detail: 'Supprimé' });
        this.reloadRoles();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Rôle',
          detail: apiErrorMessage(err, 'Suppression impossible'),
        }),
    });
  }

  openCreatePerm(): void {
    this.editingPermId = null;
    this.permForm.reset({ code: '', description: '' });
    this.permVisible = true;
  }

  openEditPerm(perm: Permission): void {
    this.editingPermId = perm.id;
    this.permForm.reset({ code: perm.code, description: perm.description ?? '' });
    this.permVisible = true;
  }

  savePerm(): void {
    if (this.permForm.invalid) {
      this.permForm.markAllAsTouched();
      return;
    }
    const raw = this.permForm.getRawValue();
    const req$ =
      this.editingPermId == null
        ? this.users.createPermission(raw)
        : this.users.updatePermission(this.editingPermId, raw);
    req$.subscribe({
      next: () => {
        this.permVisible = false;
        this.messages.add({
          severity: 'success',
          summary: 'Permission',
          detail: this.editingPermId == null ? 'Créée' : 'Mise à jour',
        });
        this.reloadPermissions();
        this.reloadRoles();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Permission',
          detail: apiErrorMessage(err, 'Échec de l’enregistrement'),
        }),
    });
  }

  removePerm(perm: Permission): void {
    if (!confirm(`Supprimer la permission ${perm.code} ?`)) return;
    this.users.deletePermission(perm.id).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Permission', detail: 'Supprimée' });
        this.reloadPermissions();
        this.reloadRoles();
      },
      error: (err) =>
        this.messages.add({
          severity: 'error',
          summary: 'Permission',
          detail: apiErrorMessage(err, 'Suppression impossible'),
        }),
    });
  }

  roleHas(role: Role, code: string): boolean {
    return !!role.permissions?.includes(code);
  }
}
