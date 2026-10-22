import type { RoleDetail } from 'bagad-client';
import { CheckIcon, InfoIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ACTION_LABELS,
  ACTIONS,
  type Action,
  resourceLabel,
  splitPermission,
} from '@/lib/permissions';
import { GroupTag } from '../../profiles/components/groupTag';
import { useAdminRoles } from '../queries';

const ADMIN_ROLE = 'admin';

/** Resources in display order: every resource granted to at least one role. */
function collectResources(roles: RoleDetail[]): string[] {
  const seen = new Set<string>();
  roles.forEach((role) => role.permissions.forEach((p) => seen.add(splitPermission(p).resource)));
  return [...seen].sort((a, b) => resourceLabel(a).localeCompare(resourceLabel(b), 'fr'));
}

function RoleCard({ role }: { role: RoleDetail }) {
  return (
    <div className="surface flex flex-col gap-2 rounded-3xl p-4">
      <div className="flex items-center justify-between gap-2">
        <Badge className="bg-primary/15 text-primary text-base">{role.id}</Badge>
        <span className="text-sm text-muted-foreground tabular-nums">
          {role.memberCount} membre{role.memberCount > 1 ? 's' : ''}
        </span>
      </div>
      {role.description ? <p className="text-sm text-muted-foreground">{role.description}</p> : null}
      <div className="flex flex-wrap items-center gap-1">
        {role.groups.length ? (
          role.groups.map((group) => (
            <Link key={group.id} to={`/groups/${group.id}`} className="rounded-md focus-visible:outline-2 focus-visible:outline-ring">
              <GroupTag name={group.name} color={group.color} />
            </Link>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">Porté par aucun groupe</span>
        )}
      </div>
    </div>
  );
}

function PermissionCell({ role, resource }: { role: RoleDetail; resource: string }) {
  if (role.id === ADMIN_ROLE) {
    return (
      <TableCell className="text-center">
        <CheckIcon className="mx-auto size-4 text-primary" aria-label="Toutes les actions" />
      </TableCell>
    );
  }
  const actions = ACTIONS.filter((action) => role.permissions.includes(`${action}:${resource}`));
  return (
    <TableCell>
      {actions.length ? (
        <span className="flex flex-wrap gap-1">
          {actions.map((action: Action) => (
            <Badge key={action} variant="outline" className="text-xs">{ACTION_LABELS[action]}</Badge>
          ))}
        </span>
      ) : <span className="text-muted-foreground" aria-label="Aucune action">—</span>}
    </TableCell>
  );
}

export default function RolesSection() {
  const { data: roles } = useAdminRoles();

  if (!roles) {
    return <Skeleton className="h-64 w-full" />;
  }

  const resources = collectResources(roles);

  return (
    <div className="flex flex-col gap-6">
      <Alert>
        <InfoIcon />
        <AlertTitle>Les permissions sont définies dans le code</AlertTitle>
        <AlertDescription>
          Un rôle ne se modifie pas ici : on choisit quels groupes le portent (dans la fiche du
          groupe). Le rôle <code>admin</code> dispose de toutes les actions sur toutes les ressources.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {roles.map((role) => <RoleCard key={role.id} role={role} />)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matrice des permissions</CardTitle>
          <CardDescription>Ce que chaque rôle peut faire sur chaque ressource.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ressource</TableHead>
                {roles.map((role) => (
                  <TableHead key={role.id} className="whitespace-nowrap">{role.id}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource) => (
                <TableRow key={resource}>
                  <TableCell className="font-medium whitespace-nowrap">{resourceLabel(resource)}</TableCell>
                  {roles.map((role) => (
                    <PermissionCell key={role.id} role={role} resource={resource} />
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
