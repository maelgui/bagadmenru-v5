import { CalendarDays, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CopyButton } from '@/components/ui/copy-button';
import env from '../../../env';
import ApiKeysSection from '../components/settings/apiKeysSection';

/**
 * "Accès API" settings section: manage per-member API keys and show how to use
 * one to subscribe to the authenticated (per-member) ICS calendar feed.
 */
export default function SettingsApiPage() {
  // The authenticated ICS feed reads the key from the ``api_key`` query param
  // so a calendar app can subscribe by URL alone. The public feed
  // (/export/ics) stays unauthenticated for existing subscriptions.
  const icsBase = `${env.VITE_BBE2_API_URL}/api/v1/events/export/ics/me`;

  return (
    <div className="flex flex-col gap-6">
      <ApiKeysSection />

      <Alert>
        <Info />
        <AlertDescription>
          <p className="pb-2 font-semibold">Calendrier authentifié (ICS)</p>
          <p className="pb-4">
            Avec une clé autorisant l&apos;export du calendrier, abonnez votre application
            en ajoutant votre clé à l&apos;URL ci-dessous (remplacez
            {' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">VOTRE_CLE</code>
            {' '}
            par la clé copiée à sa création) :
          </p>
          <code className="mb-4 block w-full overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs break-all">
            {`${icsBase}?api_key=VOTRE_CLE`}
          </code>
          <CopyButton
            value={`${icsBase}?api_key=`}
            label="Copier le début de l'URL"
            icon={CalendarDays}
            variant="ghost"
          />
        </AlertDescription>
      </Alert>
    </div>
  );
}
