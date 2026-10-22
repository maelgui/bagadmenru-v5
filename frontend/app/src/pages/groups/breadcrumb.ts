import { usePermissions } from '../../config/client';

interface Crumb {
  title: React.ReactNode;
  link?: string;
}

/**
 * Parent crumbs for the group pages. The group list lives in the admin area,
 * so only `view:admin` holders get a path back to it; other members reached
 * the group from a profile and are sent back to the trombinoscope.
 */
export function useGroupsBreadcrumb(): Crumb[] {
  const { can } = usePermissions();
  if (can('view', 'admin')) {
    return [
      { title: 'Administration', link: '/admin' },
      { title: 'Groupes', link: '/admin/groups' },
    ];
  }
  return [{ title: 'Liste des membres', link: '/profile' }];
}

/** Where to land after creating or editing a group. */
export function useGroupsReturnPath(): string {
  const { can } = usePermissions();
  return can('view', 'admin') ? '/admin/groups' : '/profile';
}
