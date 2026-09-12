import { RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Spinner } from '@/components/ui/spinner';
import ShareLinkButton, { canWebShare } from './ShareLinkButton';

/**
 * Primary invite surface: a QR code (scan in person) plus share/copy actions
 * and the link in plain text. Handles loading and error states.
 */
export default function QrInviteCard({
  loading,
  invitationUrl,
  onRefetch,
}: {
  loading: boolean;
  invitationUrl: string | undefined;
  onRefetch: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border p-6 text-center">
      <h2 className="text-lg font-medium">Faites scanner ce QR code</h2>
      <p className="text-sm text-muted-foreground">
        Montrez-le au nouveau membre, ou partagez le lien pour l&apos;envoyer par
        message. Chaque lien ne permet qu&apos;une seule inscription&nbsp;:
        générez-en un nouveau pour chaque personne avec «&nbsp;Nouveau
        lien&nbsp;».
      </p>

      <div className="flex min-h-[208px] items-center justify-center">
        {loading ? (
          <Spinner />
        ) : invitationUrl === undefined ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-destructive">Impossible de générer le lien.</p>
            <Button type="button" variant="outline" onClick={onRefetch}>
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              Réessayer
            </Button>
          </div>
        ) : (
          <div className="rounded-lg bg-white p-4">
            <QRCodeSVG
              value={invitationUrl}
              size={192}
              role="img"
              aria-label="QR code du lien d'invitation"
            />
          </div>
        )}
      </div>

      {invitationUrl !== undefined ? (
        <>
          {/* Show the link in plain text too: readable aloud, and a fallback
              when the QR cannot be scanned. */}
          <p className="w-full break-all rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {invitationUrl}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {canWebShare() ? <ShareLinkButton url={invitationUrl} /> : null}
            <CopyButton value={invitationUrl} label="Copier le lien" />
            <Button type="button" variant="ghost" onClick={onRefetch}>
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              Nouveau lien
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
