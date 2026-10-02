import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  permissions?: string[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, TooltipModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly user = this.auth.user;
  /** Menu réduit aux icônes, sur grand écran. */
  readonly collapsed = signal(false);
  /** Tiroir ouvert, sur smartphone. Fermé par défaut pour ne pas couvrir la page. */
  readonly mobileNavOpen = signal(false);
  readonly showLabels = computed(() => this.mobileNavOpen() || !this.collapsed());

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.mobileNavOpen.set(false));

    if (typeof window !== 'undefined') {
      const query = window.matchMedia('(max-width: 960px)');
      const onChange = (event: MediaQueryListEvent) => {
        if (!event.matches) this.mobileNavOpen.set(false);
      };
      query.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
    }
  }

  private readonly allNav: NavItem[] = [
    { label: 'Dashboard', icon: 'pi pi-th-large', route: '/dashboard' },
    {
      label: 'Transactions',
      icon: 'pi pi-arrows-h',
      route: '/transactions',
      permissions: ['TX_READ', 'TX_WRITE'],
    },
    { label: 'SMS', icon: 'pi pi-envelope', route: '/sms', permissions: ['SMS_SEND'] },
    {
      label: 'Gateway',
      icon: 'pi pi-wifi',
      route: '/gateways',
      permissions: ['GATEWAYS_READ', 'GATEWAYS_WRITE'],
    },
    {
      label: 'Utilisateurs',
      icon: 'pi pi-users',
      route: '/users',
      permissions: ['USERS_READ', 'USERS_WRITE'],
    },
    {
      label: 'Opérateurs',
      icon: 'pi pi-building',
      route: '/operators',
      permissions: ['USSD_WRITE'],
    },
    {
      label: 'Types d’opérations',
      icon: 'pi pi-bolt',
      route: '/operation-types',
      permissions: ['SETTINGS_WRITE', 'USERS_WRITE', 'ROLES_WRITE'],
    },
    {
      label: 'Motifs d’annulation',
      icon: 'pi pi-ban',
      route: '/cancellation-reasons',
      permissions: ['SETTINGS_WRITE', 'USERS_WRITE', 'TX_WRITE'],
    },
    {
      label: 'Comptes distributeurs',
      icon: 'pi pi-wallet',
      route: '/distributors',
      permissions: ['DISTRIBUTORS_READ', 'DISTRIBUTORS_WRITE'],
    },
    { label: 'Historique', icon: 'pi pi-history', route: '/history', permissions: ['TX_READ'] },
    { label: 'Alertes', icon: 'pi pi-bell', route: '/alerts', permissions: ['ALERTS_WRITE', 'GATEWAYS_READ'] },
    { label: 'Rapports', icon: 'pi pi-file', route: '/reports', permissions: ['REPORTS_READ'] },
    { label: 'Statistiques', icon: 'pi pi-chart-bar', route: '/statistics', permissions: ['REPORTS_READ'] },
    { label: 'Journal', icon: 'pi pi-book', route: '/journal', permissions: ['AUDIT_READ'] },
    {
      label: 'Paramètres',
      icon: 'pi pi-cog',
      route: '/settings',
      permissions: ['SETTINGS_WRITE', 'USERS_WRITE'],
    },
    {
      label: 'Administration',
      icon: 'pi pi-shield',
      route: '/admin',
      permissions: ['ROLES_WRITE', 'USERS_WRITE'],
    },
  ];

  readonly nav = computed(() =>
    this.allNav.filter(
      (item) => !item.permissions?.length || this.auth.hasPermission(...item.permissions),
    ),
  );

  toggleSidebar(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 960px)').matches) {
      this.mobileNavOpen.update((open) => !open);
      return;
    }
    this.collapsed.update((v) => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
  }
}
