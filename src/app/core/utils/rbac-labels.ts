/** Libellés français pour les rôles (le code technique reste inchangé). */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  SUPERVISOR: 'Superviseur',
  DISTRIBUTEUR: 'Distributeur',
  DISTRIBUTOR: 'Distributeur',
  OPERATOR: 'Opérateur',
  GATEWAY: 'Gateway',
};

/** Libellés français pour les permissions. */
export const PERMISSION_LABELS: Record<string, string> = {
  USERS_READ: 'Consulter les utilisateurs',
  USERS_WRITE: 'Gérer les utilisateurs',
  ROLES_WRITE: 'Gérer les rôles et permissions',
  GATEWAYS_READ: 'Consulter les gateways',
  GATEWAYS_WRITE: 'Gérer les gateways',
  TX_READ: 'Consulter les transactions',
  TX_WRITE: 'Créer / modifier les transactions',
  SMS_SEND: 'Envoyer des SMS',
  REPORTS_READ: 'Consulter les rapports',
  AUDIT_READ: 'Consulter le journal d’audit',
  USSD_WRITE: 'Gérer les scénarios USSD et opérateurs',
  DISTRIBUTORS_READ: 'Consulter les distributeurs',
  DISTRIBUTORS_WRITE: 'Gérer les distributeurs',
  SETTINGS_WRITE: 'Gérer les paramètres',
  ALERTS_WRITE: 'Gérer les alertes',
};

export function roleLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return ROLE_LABELS[code] ?? code;
}

export function permissionLabel(code: string, description?: string | null): string {
  return PERMISSION_LABELS[code] ?? description ?? code;
}

export function formatRoleList(roles: string[] | null | undefined): string {
  if (!roles?.length) return '—';
  return roles.map((r) => roleLabel(r)).join(', ');
}

export function formatPermissionList(codes: string[] | null | undefined): string {
  if (!codes?.length) return '—';
  return codes.map((c) => permissionLabel(c)).join(', ');
}
