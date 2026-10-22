import type { IntegrationStatus } from 'bagad-client';
import { CheckCircle2Icon, CircleOffIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useSystemStatus } from '../queries';

const ENVIRONMENT_LABELS: Record<string, string> = {
  production: 'Production',
  development: 'Développement',
  test: 'Test',
  ci: 'CI',
};

function IntegrationItem({ integration }: { integration: IntegrationStatus }) {
  const Icon = integration.configured ? CheckCircle2Icon : CircleOffIcon;
  return (
    <Item variant="muted">
      <ItemMedia>
        <Icon
          className={cn('size-5', integration.configured ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}
          aria-hidden="true"
        />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {integration.label}
          <Badge variant={integration.configured ? 'secondary' : 'outline'}>
            {integration.configured ? 'Configurée' : 'Non configurée'}
          </Badge>
        </ItemTitle>
        {integration.detail ? (
          <ItemDescription className="font-mono text-xs">{integration.detail}</ItemDescription>
        ) : null}
      </ItemContent>
    </Item>
  );
}

export default function SystemSection() {
  const { data: system } = useSystemStatus();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Déploiement</CardTitle>
          <CardDescription>Versions en cours d&apos;exécution.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Environnement</p>
            <p className="text-lg font-medium">
              {system ? (ENVIRONMENT_LABELS[system.environment] ?? system.environment) : <Skeleton className="h-7 w-24" />}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Backend</p>
            <p className="font-mono text-lg">{system ? system.version : <Skeleton className="h-7 w-24" />}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Frontend</p>
            <p className="font-mono text-lg">{import.meta.env.VITE_APP_VERSION ?? 'dev'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intégrations</CardTitle>
          <CardDescription>
            Services externes dont dépend l&apos;application, d&apos;après la configuration du
            backend. Aucun secret n&apos;est affiché.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!system ? <Skeleton className="h-64 w-full" /> : (
            <ItemGroup className="gap-2">
              {system.integrations.map((integration) => (
                <IntegrationItem key={integration.key} integration={integration} />
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
