import { useQuery } from '@tanstack/react-query';
import type { CampaignListItem } from 'bagad-client';
import { ChevronRight, PlusCircle, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import Container from '../../components/container';
import Header from '../../components/header';
import { useApiClient, usePermissions } from '../../config/client';
import StatusBadge from './components/StatusBadge';

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateRange(campaign: CampaignListItem): string | null {
  const { firstEventDate, lastEventDate } = campaign;
  if (!firstEventDate || !lastEventDate) return null;
  if (firstEventDate.getTime() === lastEventDate.getTime()) return formatDate(firstEventDate);
  return `${formatDate(firstEventDate)} – ${formatDate(lastEventDate)}`;
}

export default function CampaignListPage() {
  const navigate = useNavigate();
  const { campaignsApi } = useApiClient();
  const { can } = usePermissions();
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const { data: campaigns, isPending } = useQuery<CampaignListItem[]>({
    queryKey: ['campaigns'],
    queryFn: async () => await campaignsApi.listCampaignsApiV1CampaignsGet(),
  });

  const groups = useMemo(() => {
    const unique = new Map<number, { id: number; name: string }>();
    for (const campaign of campaigns ?? []) {
      if (!unique.has(campaign.group.id)) unique.set(campaign.group.id, campaign.group);
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return [];
    if (!selectedGroupId) return campaigns;
    return campaigns.filter((c) => c.groupId === Number(selectedGroupId));
  }, [campaigns, selectedGroupId]);

  return (
    <>
      <Header
        title="Campagnes"
        subtitle="Regrouper des évènements sous un thème commun"
        breadcrumb={[{ title: 'Campagnes' }]}
        actions={can('create', 'campaign') ? [
          <Link key="add-campaign" to="/campaigns/add" className={cn(buttonVariants())}>
            <PlusCircle data-icon="inline-start" />
            Nouvelle campagne
          </Link>,
        ] : []}
      />
      <Container>
        {isPending ? (
          <div className="flex justify-center py-12" role="status" aria-label="Chargement des campagnes">
            <Spinner className="size-6" />
          </div>
        ) : campaigns?.length ? (
          <div className="flex flex-col gap-4">
            {groups.length > 1 ? (
              <NativeSelect
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                aria-label="Filtrer par groupe"
              >
                <NativeSelectOption value="">Tous les groupes</NativeSelectOption>
                {groups.map((group) => (
                  <NativeSelectOption key={group.id} value={group.id}>
                    {group.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : null}

            {filteredCampaigns.length ? (
              <ItemGroup>
                {filteredCampaigns.map((campaign) => {
                  const dateRange = formatDateRange(campaign);
                  return (
                    <Item
                      key={campaign.id}
                      variant="outline"
                      render={<button type="button" onClick={() => { void navigate(`/campaigns/${campaign.id}`); }} />}
                    >
                      <ItemContent>
                        <ItemTitle>
                          {campaign.name}
                          <StatusBadge status={campaign.status} />
                        </ItemTitle>
                        {dateRange ? <ItemDescription>{dateRange}</ItemDescription> : null}
                      </ItemContent>
                      <ItemActions className="gap-3">
                        <Badge
                          variant="outline"
                          style={{ borderColor: campaign.group.color, color: campaign.group.color }}
                        >
                          {campaign.group.name}
                        </Badge>
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                      </ItemActions>
                    </Item>
                  );
                })}
              </ItemGroup>
            ) : (
              <Alert>
                <TriangleAlert />
                <AlertDescription>Aucune campagne pour ce groupe.</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <Alert>
            <TriangleAlert />
            <AlertDescription>Aucune campagne pour le moment.</AlertDescription>
          </Alert>
        )}
      </Container>
    </>
  );
}
