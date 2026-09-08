import { CalendarPlus, Check, Copy } from 'lucide-react';
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

const COPY_FEEDBACK_MS = 2000;

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
 * Calendar sync dialog (presentational). The parent mints a dedicated
 * "Calendrier" API key when the dialog opens and passes the resulting personal
 * ICS URL in. The link is always shown in a read-only field with a copy
 * button; Apple devices additionally get a one-tap "Ajouter à mon agenda"
 * button that opens the webcal:// subscribe flow. No API-key jargon is exposed
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
                  ? 'Touchez « Ajouter à mon agenda », ou copiez ce lien pour l\u2019ajouter manuellement.'
                  : 'Copiez ce lien et ajoutez-le dans votre application de calendrier (sur Google Agenda : « Ajouter un agenda » › « À partir d\u2019une URL »).'}
              </p>
              <IcsLinkField url={icsUrl} />
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          {icsUrl && apple && webcalUrl ? (
            <Button render={<a href={webcalUrl} />}>
              <CalendarPlus data-icon="inline-start" />
              Ajouter à mon agenda
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
