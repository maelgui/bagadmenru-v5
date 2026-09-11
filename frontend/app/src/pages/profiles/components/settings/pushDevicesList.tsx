import { useMutation, useQuery } from '@tanstack/react-query';
import type { PushDevice } from 'bagad-client';
import { DateTime } from 'luxon';
import {
  BellOffIcon,
  BellPlusIcon,
  MonitorIcon,
  MonitorSmartphoneIcon,
  SmartphoneIcon,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { UAParser } from 'ua-parser-js';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
  ItemDescription,
} from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import env from '../../../../env';
import { queryClient, useApiClient } from '../../../../config/client';
import { usePushNotifications } from '../../../../utils/usePushNotifications';

const PUSH_DEVICES_QUERY_KEY = ['push', 'devices'] as const;

/** Friendly "Chrome · macOS" style label, with a stable fallback. */
function deviceLabel(userAgent?: string | null): string {
  const { browser, os } = UAParser(userAgent ?? '');
  const parts = [browser.name, os.name].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Appareil inconnu';
}

/** Pick an icon hinting at the device family from its OS name. */
function DeviceIcon({ osName }: { osName?: string }) {
  if (osName === 'iOS' || osName === 'Android') {
    return <SmartphoneIcon aria-hidden="true" />;
  }
  if (!osName) {
    return <MonitorSmartphoneIcon aria-hidden="true" />;
  }
  return <MonitorIcon aria-hidden="true" />;
}

function DeviceItem({
  device,
  isThisDevice,
  onRemove,
}: {
  device: PushDevice;
  isThisDevice: boolean;
  onRemove: () => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { os } = UAParser(device.userAgent ?? '');
  const label = deviceLabel(device.userAgent);

  return (
    <Item variant="outline">
      <ItemMedia variant="icon">
        <DeviceIcon osName={os.name} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="flex items-center gap-2">
          {label}
          {isThisDevice ? <Badge variant="secondary">Cet appareil</Badge> : null}
        </ItemTitle>
        <ItemDescription>
          {device.lastUsedAt ? (
            <span title={device.lastUsedAt.toLocaleString()}>
              {`Dernière notification ${DateTime.fromJSDate(device.lastUsedAt).toRelative()}`}
            </span>
          ) : (
            <span title={device.createdAt.toLocaleString()}>
              Aucune notification envoyée pour l&apos;instant
            </span>
          )}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogTrigger
            render={<Button variant="ghost" size="sm" aria-label={`Retirer ${label}`} />}
          >
            <Trash2 data-icon="inline-start" />
            Retirer
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Retirer cet appareil ?</AlertDialogTitle>
              <AlertDialogDescription>
                {isThisDevice
                  ? `${label} ne recevra plus de notifications push. Vous pourrez les réactiver depuis cet appareil.`
                  : `${label} ne recevra plus de notifications push. Cet appareil pourra les réactiver en s'y reconnectant.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  onRemove();
                  setIsDeleteDialogOpen(false);
                }}
              >
                Retirer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ItemActions>
    </Item>
  );
}

function DeviceListBody({
  devices,
  isPending,
  thisDeviceHash,
  onRemove,
}: {
  devices: PushDevice[] | undefined;
  isPending: boolean;
  thisDeviceHash: string | null;
  onRemove: (args: { id: string; isThisDevice: boolean }) => void;
}) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  if (!devices || devices.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyMedia variant="icon">
          <MonitorSmartphoneIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Aucun appareil</EmptyTitle>
        <EmptyDescription>
          Activez les notifications sur cet appareil pour l&apos;enregistrer ici.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Appareils recevant les notifications</p>
      <ItemGroup>
        {devices.map((device) => {
          const isThisDevice = device.deviceHash === thisDeviceHash;
          return (
            <DeviceItem
              key={device.id}
              device={device}
              isThisDevice={isThisDevice}
              onRemove={() => onRemove({ id: device.id, isThisDevice })}
            />
          );
        })}
      </ItemGroup>
    </div>
  );
}

/** Capability / permission guard message when push cannot be enabled here. */
function PushGuard({ denied }: { denied: boolean }) {
  return (
    <Alert variant={denied ? 'destructive' : undefined}>
      <BellOffIcon aria-hidden="true" />
      <AlertDescription>
        {denied
          ? 'Les notifications sont bloquées. Autorisez-les dans les paramètres de votre navigateur pour activer cet appareil.'
          : 'Les notifications push ne sont pas supportées par votre navigateur.'}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Per-device push subscriptions list. The backend list is the source of truth
 * for which devices are subscribed, with a per-device revoke and an "enable on
 * this device" action. Removing the current device also tears down its browser
 * subscription, so the two states never desync. This is layered *under* the
 * per-user master switch (`pushEnabled`): when the master switch is off,
 * devices stay registered but the section is dimmed and no test is offered,
 * since the backend suppresses delivery.
 */
export default function PushDevicesList({ pushEnabled }: { pushEnabled: boolean }) {
  const { pushApi } = useApiClient();
  const push = usePushNotifications();

  const { data: devices, isPending, isError } = useQuery({
    queryKey: PUSH_DEVICES_QUERY_KEY,
    queryFn: async () => await pushApi.listSubscriptionsApiV1PushSubscriptionsGet(),
  });

  const { mutate: removeDevice } = useMutation({
    mutationFn: async ({ id, isThisDevice }: { id: string; isThisDevice: boolean }) => {
      await pushApi.deleteSubscriptionApiV1PushSubscriptionsSubscriptionIdDelete({
        subscriptionId: id,
      });
      // When removing the current device, also tear down its browser
      // subscription so it does not linger and the toggle/state stays in sync.
      if (isThisDevice) {
        await push.unsubscribeBrowser();
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PUSH_DEVICES_QUERY_KEY });
      toast.add({ title: 'Appareil retiré.', type: 'success' });
    },
    onError: () => {
      toast.add({ title: 'Impossible de retirer cet appareil.', type: 'error' });
    },
  });

  const { mutate: enableThisDevice, isPending: isEnabling } = useMutation({
    mutationFn: async () => {
      const ok = await push.enableThisDevice();
      if (!ok) {
        throw new Error('enable failed');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PUSH_DEVICES_QUERY_KEY });
      toast.add({ title: 'Notifications activées sur cet appareil.', type: 'success' });
    },
    onError: () => {
      toast.add({
        title: "Impossible d'activer les notifications sur cet appareil.",
        type: 'error',
      });
    },
  });

  const handleTest = async () => {
    try {
      const response = await fetch(`${env.VITE_BBE2_API_URL || ''}/api/v1/push/test`, {
        method: 'POST',
        credentials: 'include',
      });
      toast.add(
        response.ok
          ? { title: 'Notification de test envoyée !', type: 'success' }
          : { title: "Erreur lors de l'envoi de la notification.", type: 'error' },
      );
    } catch {
      toast.add({ title: 'Erreur réseau.', type: 'error' });
    }
  };

  const guarded = !push.isSupported || push.status === 'denied';
  const thisDeviceRegistered = devices?.some(
    (d) => d.deviceHash === push.thisDeviceHash,
  ) ?? false;
  const canEnableHere = !guarded && !thisDeviceRegistered;

  return (
    <div
      className={`flex flex-col gap-4 ${!pushEnabled ? 'opacity-60' : ''}`}
      aria-disabled={!pushEnabled || undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">Vos appareils</p>
        {canEnableHere ? (
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => enableThisDevice()}
            disabled={isEnabling || push.isLoading}
          >
            <BellPlusIcon data-icon="inline-start" aria-hidden="true" />
            Activer sur cet appareil
          </Button>
        ) : null}
      </div>

      {guarded ? (
        <PushGuard denied={push.status === 'denied'} />
      ) : isError ? null : (
        <DeviceListBody
          devices={devices}
          isPending={isPending}
          thisDeviceHash={push.thisDeviceHash}
          onRemove={removeDevice}
        />
      )}

      {pushEnabled && !guarded && thisDeviceRegistered && devices && devices.length > 0 ? (
        <div>
          <Button type="button" variant="link" size="sm" onClick={handleTest}>
            Envoyer une notification de test
          </Button>
        </div>
      ) : null}
    </div>
  );
}
