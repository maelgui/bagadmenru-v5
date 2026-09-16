import { useMutation, useQuery } from '@tanstack/react-query';
import type { UnlinkedMembership } from 'bagad-client';
import { LinkIcon, MailPlus, Trash2, WalletIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import Container from '../../components/container';
import Header from '../../components/header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import {
  queryClient,
  useApiClient,
} from '../../config/client';

const CENTS_PER_EURO = 100;

/**
 * HelloAsso membership orders that could not be auto-linked to a member
 * (payer email did not match). Admin reconciliation only, so the hook lives
 * here with its sole consumer rather than in the shared client module.
 */
function useUnlinkedMemberships() {
  const { helloAssoApi } = useApiClient();

  return useQuery<UnlinkedMembership[]>({
    queryKey: ['helloasso', 'unlinked'],
    queryFn: async () => await helloAssoApi.listUnlinkedMembershipsApiV1HelloassoOrdersUnlinkedGet(),
  });
}

/**
 * Member option for the picker. base-ui's Combobox uses the `{ value, label }`
 * shape automatically for form value and display, so no custom mapping props
 * are needed.
 */
interface MemberOption {
  value: string;
  label: string;
}

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

function payerName(order: UnlinkedMembership): string {
  const name = [order.payerFirstName, order.payerLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || order.payerEmail || 'Payeur inconnu';
}

function adherentName(order: UnlinkedMembership): string | null {
  const name = [order.adherentFirstName, order.adherentLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || null;
}

/**
 * The address to invite the adherent on. The adherent's own email (from the
 * HelloAsso "Email" custom field) is what we want; the payer email is only a
 * fallback since the payer is often someone else (e.g. a parent).
 */
function inviteEmail(order: UnlinkedMembership): string | null {
  return order.adherentEmail || order.payerEmail || null;
}

/** First name to personalise the invitation email: adherent, else payer. */
function inviteFirstName(order: UnlinkedMembership): string | undefined {
  return order.adherentFirstName || order.payerFirstName || undefined;
}

/**
 * One unlinked order with a member picker and a link action. Kept as its own
 * component so each row owns its selection state independently.
 */
function UnlinkedRow({
  order,
  members,
}: {
  order: UnlinkedMembership;
  members: MemberOption[];
}) {
  const { helloAssoApi, invitationsApi } = useApiClient();
  const [selected, setSelected] = useState<MemberOption | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { mutate: link, isPending } = useMutation({
    mutationFn: async (userId: string) => await helloAssoApi
      .linkMembershipApiV1HelloassoOrdersMembershipIdLinkPost({
        membershipId: order.id,
        membershipLinkRequest: { userId },
      }),
    onSuccess: async () => {
      toast.add({ title: 'Adhésion rattachée au membre.', type: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['helloasso', 'unlinked'] });
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: () => {
      toast.add({ title: 'Une erreur est survenue.', type: 'error' });
    },
  });

  const { mutate: remove, isPending: isDeleting } = useMutation({
    mutationFn: async () => await helloAssoApi
      .deleteMembershipApiV1HelloassoOrdersMembershipIdDelete({ membershipId: order.id }),
    onSuccess: async () => {
      toast.add({ title: 'Adhésion supprimée.', type: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['helloasso', 'unlinked'] });
    },
    onError: () => {
      toast.add({ title: 'Une erreur est survenue.', type: 'error' });
    },
  });

  const email = inviteEmail(order);

  const { mutate: invite, isPending: isInviting } = useMutation({
    mutationFn: async () => await invitationsApi
      .createInvitationApiV1InvitationsPost({
        invitationCreate: {
          channel: 'email',
          email,
          firstName: inviteFirstName(order),
        },
      }),
    onSuccess: () => {
      toast.add({ title: 'Invitation envoyée par email.', type: 'success' });
      setInviteOpen(false);
    },
    onError: () => {
      toast.add({ title: 'Impossible d\'envoyer l\'invitation.', type: 'error' });
    },
  });

  return (
    <li className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">
          {adherentName(order) ?? payerName(order)}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {[order.tierName ?? order.tierDescription ?? 'Adhésion',
            `payé par ${payerName(order)}`]
            .join(' · ')}
        </span>
        <span className="text-xs text-muted-foreground">
          {`${formatDate(order.orderDate)} · ${formatAmount(order.amount)}`}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="w-56">
          <Combobox<MemberOption>
            items={members}
            value={selected}
            onValueChange={setSelected}
          >
            <ComboboxInput placeholder="Choisir un membre" showClear />
            <ComboboxContent>
              <ComboboxEmpty>Aucun membre trouvé.</ComboboxEmpty>
              <ComboboxList>
                {(m: MemberOption) => (
                  <ComboboxItem key={m.value} value={m}>
                    {m.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        <Button
          disabled={!selected || isPending || isDeleting}
          onClick={() => selected && link(selected.value)}
        >
          <LinkIcon data-icon="inline-start" />
          Rattacher
        </Button>
        <AlertDialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <AlertDialogTrigger
            render={<Button variant="outline" />}
            disabled={!email || isInviting}
            title={email
              ? `Inviter ${email} à créer son compte`
              : 'Aucune adresse email disponible pour cette adhésion'}
          >
            <MailPlus data-icon="inline-start" />
            Inviter
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Envoyer une invitation ?</AlertDialogTitle>
              <AlertDialogDescription>
                {`Une invitation à créer son compte sera envoyée par email à `}
                <span className="font-medium text-foreground">{email}</span>
                {`. Une fois le compte créé avec cette adresse, l'adhésion `}
                {'lui sera rattachée automatiquement.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction pending={isInviting} onClick={() => invite()}>
                Envoyer l&apos;invitation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="outline" size="icon" aria-label="Supprimer" />}
            disabled={isDeleting}
          >
            <Trash2 aria-hidden="true" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette adhésion ?</AlertDialogTitle>
              <AlertDialogDescription>
                {`La commande de ${payerName(order)} sera définitivement `
                  + 'supprimée. À utiliser pour les doublons ou erreurs.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                pending={isDeleting}
                onClick={() => remove()}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}

export default function MembershipReconciliationPage() {
  const { usersApi } = useApiClient();
  const { data: unlinked, isPending } = useUnlinkedMemberships();
  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => await usersApi.listProfilesApiV1ProfilesGet(),
  });

  const members = useMemo<MemberOption[]>(
    () => (profiles ?? []).map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName}`,
    })),
    [profiles],
  );

  return (
    <>
      <Header
        title="Rapprochement des adhésions"
        subtitle="Rattachez les commandes HelloAsso qui n'ont pas pu être associées automatiquement"
        breadcrumb={[{ title: 'Rapprochement des adhésions' }]}
      />

      <Container>
        <Card>
          <CardHeader>
            <CardTitle>Commandes non rattachées</CardTitle>
            <CardDescription>
              Ces adhésions n&apos;ont pas pu être associées à un membre (email
              du payeur inconnu). Sélectionnez le membre correspondant pour
              chacune.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-16" />
                ))}
              </div>
            ) : unlinked && unlinked.length > 0 ? (
              <ul className="flex flex-col divide-y">
                {unlinked.map((order) => (
                  <UnlinkedRow key={order.id} order={order} members={members} />
                ))}
              </ul>
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <WalletIcon aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>Tout est à jour</EmptyTitle>
                  <EmptyDescription>
                    Aucune commande HelloAsso en attente de rapprochement.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
