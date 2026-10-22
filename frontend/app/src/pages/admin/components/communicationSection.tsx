import { useMutation } from '@tanstack/react-query';
import { BellRingIcon, MailCheckIcon, MailIcon } from 'lucide-react';
import { DateTime } from 'luxon';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { useApiClient } from '../../../config/client';
import { GroupTag } from '../../profiles/components/groupTag';
import { useAdminMembers, useGroups } from '../queries';

function Stat({ value, label }: { value: number | undefined; label: string }) {
  return (
    <div>
      <p className="text-3xl font-semibold tabular-nums">
        {value === undefined ? <Skeleton className="h-9 w-12" /> : value}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function MailingListsCard() {
  const { data: groups } = useGroups();
  const withList = groups?.filter((g) => g.mailingList) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mailing lists</CardTitle>
        <CardDescription>
          Une liste par groupe, synchronisée avec les membres actifs qui acceptent les e-mails.
          La synchronisation se pilote depuis la fiche du groupe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!groups ? <Skeleton className="h-32 w-full" /> : null}
        {groups && withList.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><MailIcon /></EmptyMedia>
              <EmptyTitle>Aucune mailing list</EmptyTitle>
              <EmptyDescription>Associez une liste à un groupe depuis sa fiche.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {withList.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Groupe</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Abonnés attendus</TableHead>
                <TableHead>Synchronisation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withList.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <Link to={`/groups/${group.id}`} className="hover:underline">
                      <GroupTag name={group.name} color={group.color} />
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{group.mailingList}@bagadmenru.bzh</TableCell>
                  <TableCell className="tabular-nums">
                    {group.members.filter((m) => m.isActive && m.receivesEmails).length}
                  </TableCell>
                  <TableCell>
                    {group.mailingListSyncError ? (
                      <Badge variant="destructive" title={group.mailingListSyncError}>Erreur</Badge>
                    ) : group.mailingListSyncedAt ? (
                      <span className="text-xs text-muted-foreground">
                        {DateTime.fromJSDate(group.mailingListSyncedAt).toRelative()}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Jamais</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function CommunicationSection() {
  const { adminApi, pushApi } = useApiClient();
  const { data: members } = useAdminMembers();
  const active = members?.filter((m) => m.isActive);

  const testEmail = useMutation({
    mutationFn: async () => await adminApi.sendTestEmailApiV1AdminNotificationsTestEmailPost(),
    onSuccess: () => toast.add({ title: 'E-mail de test envoyé à votre adresse.', type: 'success' }),
    onError: () => toast.add({ title: "L'envoi de l'e-mail de test a échoué.", type: 'error' }),
  });

  const testPush = useMutation({
    mutationFn: async () => {
      await pushApi.testPushApiV1PushTestPost();
    },
    onSuccess: () => toast.add({ title: 'Notification de test envoyée à vos appareils.', type: 'success' }),
    onError: () => toast.add({ title: "L'envoi de la notification de test a échoué.", type: 'error' }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>E-mails</CardTitle>
            <CardDescription>Membres actifs joignables par e-mail.</CardDescription>
            <CardAction>
              <Button size="sm" variant="outline" onClick={() => testEmail.mutate()} disabled={testEmail.isPending}>
                <MailCheckIcon data-icon="inline-start" />
                M&apos;envoyer un test
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex gap-8">
            <Stat value={active?.filter((m) => m.receivesEmails).length} label="acceptent les e-mails" />
            <Stat value={active?.filter((m) => !m.receivesEmails).length} label="désabonnés" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications push</CardTitle>
            <CardDescription>Appareils abonnés aux notifications.</CardDescription>
            <CardAction>
              <Button size="sm" variant="outline" onClick={() => testPush.mutate()} disabled={testPush.isPending}>
                <BellRingIcon data-icon="inline-start" />
                M&apos;envoyer un test
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex gap-8">
            <Stat value={active?.reduce((n, m) => n + m.pushSubscriptionCount, 0)} label="appareils" />
            <Stat value={active?.filter((m) => m.pushSubscriptionCount > 0).length} label="membres équipés" />
          </CardContent>
        </Card>
      </div>

      <MailingListsCard />
    </div>
  );
}
