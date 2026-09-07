import { MembershipStatus } from 'bagad-client';
import { WalletIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useMembership } from '../../../../config/client';

const CENTS_PER_EURO = 100;

const STATUS_META: Record<
  MembershipStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  [MembershipStatus.Active]: { label: 'À jour', variant: 'default' },
  [MembershipStatus.Expired]: { label: 'Expirée', variant: 'secondary' },
  [MembershipStatus.None]: { label: 'Aucune adhésion', variant: 'outline' },
};

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / CENTS_PER_EURO);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Membership status + history, sourced from HelloAsso. Reused by the member's
 * own settings section and the admin profile view (pass `profileId` for the
 * latter). Status is computed server-side per season (1 Sept - 31 Aug).
 */
export default function MembershipSection({ profileId }: { profileId?: string } = {}) {
  const { data: membership, isPending } = useMembership(profileId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adhésion</CardTitle>
        <CardDescription>
          Votre statut d&apos;adhésion et l&apos;historique de vos cotisations,
          synchronisés depuis HelloAsso.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {isPending || !membership ? (
          <div className="flex items-center justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  Saison
                  {' '}
                  {membership.currentSeason}
                </span>
                {membership.status === MembershipStatus.Active && membership.activeSeason ? (
                  <span className="text-sm text-muted-foreground">
                    Adhésion valable pour la saison en cours.
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Aucune adhésion enregistrée pour la saison en cours.
                  </span>
                )}
              </div>
              <Badge variant={STATUS_META[membership.status].variant}>
                {STATUS_META[membership.status].label}
              </Badge>
            </div>

            {membership.history.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-medium">Historique</span>
                  <ul className="flex flex-col divide-y">
                    {membership.history.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-4 py-2.5"
                      >
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-sm font-medium">
                            {item.tierName ?? item.tierDescription ?? 'Adhésion'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {`Saison ${item.season} · ${formatDate(item.orderDate)}`}
                          </span>
                        </div>
                        <span className="text-sm tabular-nums">
                          {formatAmount(item.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {membership.history.length === 0 && (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <WalletIcon aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>Aucune adhésion</EmptyTitle>
                  <EmptyDescription>
                    Aucune cotisation n&apos;a encore été enregistrée depuis
                    HelloAsso.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
