import { CalendarPlus, Copy } from 'lucide-react';
import { UAParser } from 'ua-parser-js';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

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

/**
 * Calendar sync dialog (presentational). The parent mints a dedicated
 * "Calendrier" API key when the dialog opens and passes the resulting personal
 * ICS URL in. Apple devices get a one-tap "Ajouter à mon agenda" (opens
 * webcal://); everywhere else the link is shown with a copy button
 * (Android/desktop clients subscribe by pasting the URL). No API-key jargon is
 * exposed here -- key management lives in the settings.
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

          {icsUrl && !apple ? (
            <>
              <p className="text-sm">
                Copiez ce lien et ajoutez-le dans votre application de calendrier (sur Google
                Agenda : « Ajouter un agenda » › « À partir d&apos;une URL »).
              </p>
              <code className="block w-full overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs break-all">
                {icsUrl}
              </code>
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
          {icsUrl && !apple ? (
            <CopyButton value={icsUrl} label="Copier le lien" icon={Copy} />
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
