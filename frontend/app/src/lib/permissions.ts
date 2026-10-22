/**
 * Human-friendly (fr) labels for the RBAC vocabulary. Permissions travel as
 * "action:resource" strings; the few that have an established product wording
 * keep it (`PERMISSION_LABELS`), the rest compose action + resource.
 */

export const ACTIONS = ['view', 'create', 'edit', 'delete'] as const;
export type Action = (typeof ACTIONS)[number];

export const ACTION_LABELS: Record<Action, string> = {
  view: 'Voir',
  create: 'Créer',
  edit: 'Modifier',
  delete: 'Supprimer',
};

export const RESOURCE_LABELS: Record<string, string> = {
  me: 'Son propre profil',
  event: 'Évènements',
  calendar: 'Calendrier (ICS)',
  response: 'Réponses aux évènements',
  response_history: 'Historique des réponses',
  file: 'Fichiers',
  profile: 'Profils des membres',
  group: 'Groupes',
  email: 'Boîte e-mail',
  invitation: 'Invitations',
  membership: 'Adhésions des membres',
  admin: 'Administration',
};

const PERMISSION_LABELS: Record<string, string> = {
  'view:calendar': 'Synchroniser le calendrier (ICS)',
  'view:event': 'Voir les évènements',
  'view:profile': 'Voir les profils des membres',
  'view:file': 'Voir les fichiers',
  'view:group': 'Voir les groupes',
};

export function isAction(value: string): value is Action {
  return (ACTIONS as readonly string[]).includes(value);
}

export function splitPermission(permission: string): { action: string; resource: string } {
  const [action = '', resource = ''] = permission.split(':');
  return { action, resource };
}

export function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}

export function permissionLabel(permission: string): string {
  const known = PERMISSION_LABELS[permission];
  if (known) return known;
  const { action, resource } = splitPermission(permission);
  if (!isAction(action)) return permission;
  return `${ACTION_LABELS[action]} · ${resourceLabel(resource)}`;
}
