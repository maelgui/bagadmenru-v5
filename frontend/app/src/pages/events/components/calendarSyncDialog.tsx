import { CalendarDays, CalendarPlus, Check, Copy } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { UAParser } from 'ua-parser-js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { useApiClient } from '../../../config/client';
import env from '../../../env';

const COPY_FEEDBACK_MS = 2000;

// RBAC permission the authenticated ICS feed requires (view:calendar). A
// "Calendrier" key is scoped to exactly this, so it can subscribe to the feed
// but do nothing else. Matches Resource.CALENDAR in the backend.
const CALENDAR_PERMISSION = 'view:calendar';

/**
 * State and actions behind the calendar sync dialog, shared by every page
 * that offers it (calendar page, event pages header button).
 *
 * The personal ICS link is only known after a key is minted (its raw secret
 * is returned once, at creation). Calling ``openSync`` mints a dedicated
 * "Calendrier" API key on demand; closing the dialog clears the link so
 * re-opening always issues a fresh one.
 */
export function useCalendarSync() {
  const { usersApi } = useApiClient();
  const [isOpen, setIsOpen] = useState(false);

  const {
    mutate: mintLink,
    data: minted,
    isPending,
    isError,
    reset,
  } = useMutation({
    mutationFn: async () => await usersApi.createMyApiKeyApiV1ProfilesMeApiKeysPost({
      apiKeyCreate: { label: 'Calendrier', authorizedPermissions: [CALENDAR_PERMISSION] },
    }),
  });

  const icsUrl = minted
    ? `${env.VITE_BBE2_API_URL}/api/v1/events/export/ics/me?api_key=${minted.key}`
    : null;

  const openSync = () => {
    reset();
    mintLink();
    setIsOpen(true);
  };

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      reset();
    }
  };

  return {
    openSync,
    dialogProps: {
      open: isOpen, onOpenChange, icsUrl, isPending, isError,
    },
  };
}

/**
 * Whether the current device is an Apple device (iOS, iPadOS or macOS).
 *
 * On these, a ``webcal://`` link opens the system Calendar's subscribe dialog,
 * so we offer a one-tap "add to my calendar" button. iPadOS 13+ reports itself
 * as macOS, so we deliberately treat all Apple OSes the same (they all handle
 * webcal natively) rather than iOS-only, which would leave iPads without the
 * button.
 */
function isAppleDevice(): boolean {
  const { os } = UAParser();
  const name = os.name ?? '';
  return name === 'iOS' || name === 'macOS' || name === 'Mac OS';
}

/** Read-only field showing the ICS link with an inline copy button. */
function IcsLinkField({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    });
  };

  return (
    <InputGroup>
      <InputGroupInput
        readOnly
        value={url}
        aria-label="Lien du calendrier"
        onFocus={(e) => e.currentTarget.select()}
        className="font-mono text-xs"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-sm" onClick={onCopy} aria-label="Copier le lien">
          {copied ? <Check /> : <Copy />}
        </InputGroupButton>
      </InputGroupAddon>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copié dans le presse-papiers.' : ''}
      </span>
    </InputGroup>
  );
}

/**
 * One-click "add to calendar" footer shortcuts: Google Agenda for everyone,
 * plus the native webcal:// subscribe flow on Apple devices (where it is the
 * primary action, demoting Google to an outline button).
 */
function SubscribeActions({ apple, googleUrl, webcalUrl }: {
  apple: boolean;
  googleUrl: string;
  webcalUrl: string;
}) {
  return (
    <>
      <Button
        variant={apple ? 'outline' : 'default'}
        render={<a href={googleUrl} target="_blank" rel="noopener noreferrer" />}
      >
        <CalendarDays data-icon="inline-start" />
        Google Agenda
      </Button>
      {apple ? (
        <Button render={<a href={webcalUrl} />}>
          <CalendarPlus data-icon="inline-start" />
          Ajouter à mon agenda
        </Button>
      ) : null}
    </>
  );
}

/**
 * Calendar sync dialog (presentational). The parent (via ``useCalendarSync``)
 * mints a dedicated "Calendrier" API key when the dialog opens and passes the
 * resulting personal ICS URL in. The link is always shown in a read-only
 * field with a copy button, next to a one-click Google Agenda shortcut;
 * Apple devices additionally get a one-tap "Ajouter à mon agenda" button
 * that opens the webcal:// subscribe flow. No API-key jargon is exposed
 * here -- key management lives in the settings.
 */
export default function CalendarSyncDialog({
  open,
  onOpenChange,
  icsUrl,
  isPending,
  isError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icsUrl: string | null;
  isPending: boolean;
  isError: boolean;
}) {
  const apple = isAppleDevice();
  const webcalUrl = icsUrl ? icsUrl.replace(/^https?:\/\//, 'webcal://') : null;
  // Google Agenda's "add by URL" flow, pre-filled with the personal feed. The
  // cid value must be URL-encoded: the personal link carries an ?api_key=
  // query string that would otherwise be swallowed by the render URL itself.
  const googleUrl = webcalUrl
    ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter à mon agenda</DialogTitle>
          <DialogDescription>
            Retrouvez automatiquement les sorties et répétitions dans votre application de
            calendrier habituelle.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4 py-2">
          {isPending ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner />
              Préparation du lien…
            </div>
          ) : null}

          {isError ? (
            <p className="text-sm text-destructive">
              La préparation du lien a échoué. Réessayez dans un instant.
            </p>
          ) : null}

          {icsUrl ? (
            <>
              <p className="text-sm">
                {apple
                  ? 'Touchez « Ajouter à mon agenda », utilisez Google Agenda, ou copiez ce lien pour l\u2019ajouter manuellement.'
                  : 'Ajoutez le calendrier en un clic avec Google Agenda, ou copiez ce lien et ajoutez-le manuellement dans votre application de calendrier.'}
              </p>
              <IcsLinkField url={icsUrl} />
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          {googleUrl && webcalUrl ? (
            <SubscribeActions apple={apple} googleUrl={googleUrl} webcalUrl={webcalUrl} />
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
