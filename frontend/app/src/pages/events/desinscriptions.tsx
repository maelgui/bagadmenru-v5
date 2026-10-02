import { Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient } from '../../config/client';
import DisplaySelector from './components/selector';
import ResponseChangesTable from './components/response-changes-table';
import { responseChangesQuery } from './queries';

export default function DesinscriptionsPage() {
  const { eventsApi } = useApiClient();
  const { data: changes } = useQuery(responseChangesQuery(eventsApi));
  const [showAll, setShowAll] = useState(false);

  const visibleChanges = useMemo(() => {
    if (!changes) return [];
    if (showAll) return changes;
    return changes.filter((change) => change.fromValue === true && !change.toValue);
  }, [changes, showAll]);

  return (
    <>
      <Header
        title="Désinscriptions"
        subtitle="Membres passés de présent à absent"
        actions={[<DisplaySelector key="events-nav" />]}
        breadcrumb={[{ link: '/events', title: 'Évènements' }, { title: 'Désinscriptions' }]}
      />
      <Container>
        <div className="mb-6 flex items-center gap-3">
          <Switch id="show-all-changes" checked={showAll} onCheckedChange={setShowAll} />
          <label htmlFor="show-all-changes" className="text-sm">
            Afficher tous les changements de réponse
          </label>
        </div>
        {visibleChanges.length ? (
          <ResponseChangesTable changes={visibleChanges} showChange={showAll} />
        ) : (
          <Alert>
            <Info />
            <AlertDescription>
              {showAll
                ? 'Aucun changement de réponse enregistré.'
                : 'Aucune désinscription enregistrée.'}
            </AlertDescription>
          </Alert>
        )}
      </Container>
    </>
  );
}
