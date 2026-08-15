import { faChevronRight, faCircleNotch, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import type { CampaignListItem } from 'bagad-client';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../../components/alert';
import Badge from '../../components/badge';
import Container from '../../components/container';
import Header from '../../components/header';
import Select from '../../components/select';
import { useApiClient, usePermissions } from '../../config/client';

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' }> = {
    active: { label: 'Active', variant: 'success' },
    draft: { label: 'Brouillon', variant: 'warning' },
    archived: { label: 'Archivée', variant: 'muted' },
};

function formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateRange(campaign: CampaignListItem): string | null {
    const { firstEventDate, lastEventDate } = campaign;
    if (!firstEventDate || !lastEventDate) return null;
    if (firstEventDate.getTime() === lastEventDate.getTime()) {
        return formatDate(firstEventDate);
    }
    return `${formatDate(firstEventDate)} – ${formatDate(lastEventDate)}`;
}

export default function CampaignListPage() {
    const navigate = useNavigate();
    const { campaignsApi } = useApiClient();
    const { can } = usePermissions();
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');

    const { data: campaigns, isPending } = useQuery<CampaignListItem[]>({
        queryKey: ['campaigns'],
        queryFn: async () => await campaignsApi.listCampaignsApiV1CampaignsGet(),
    });

    const groups = useMemo(() => {
        if (!campaigns) return [];
        const uniqueGroups = new Map<number, { id: number; name: string }>();
        for (const campaign of campaigns) {
            if (!uniqueGroups.has(campaign.group.id)) {
                uniqueGroups.set(campaign.group.id, campaign.group);
            }
        }
        return [...uniqueGroups.values()].sort((a, b) => a.name.localeCompare(b.name));
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
                subtitle="Toutes les campagnes d'évènements"
                breadcrumb={[
                    { title: 'Campagnes' },
                ]}
                actions={can('create', 'campaign') ? [
                    <Header.Action key="add-campaign" icon={faPlus} as={Link} to="/campaigns/add">
                        Nouvelle campagne
                    </Header.Action>,
                ] : []}
            />
            <Container>
                {isPending ? (
                    <div className="flex justify-center py-12" role="status" aria-label="Chargement des campagnes">
                        <FontAwesomeIcon icon={faCircleNotch} className="animate-spin text-2xl text-gray-400" />
                    </div>
                ) : campaigns?.length ? (
                    <>
                        <div className="mb-4">
                            <Select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                aria-label="Filtrer par groupe"
                            >
                                <option value="">Tous les groupes</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <ul className="divide-y divide-gray-200">
                            {filteredCampaigns.map((campaign) => {
                                const status = statusConfig[campaign.status] ?? { label: campaign.status, variant: 'muted' as const };
                                const dateRange = formatDateRange(campaign);
                                return (
                                    <li
                                        key={campaign.id}
                                        className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 cursor-pointer"
                                        onClick={() => { void navigate(`/campaigns/${campaign.id}`); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') void navigate(`/campaigns/${campaign.id}`); }}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-gray-900 truncate">{campaign.name}</span>
                                                <Badge variant={status.variant}>{status.label}</Badge>
                                            </div>
                                            {dateRange && (
                                                <div className="mt-1 text-sm text-gray-500">
                                                    {dateRange}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <Badge
                                                style={campaign.group.color ? { backgroundColor: campaign.group.color } : undefined}
                                                variant={campaign.group.color ? undefined : 'default'}
                                            >
                                                {campaign.group.name}
                                            </Badge>
                                            <FontAwesomeIcon icon={faChevronRight} className="text-gray-400" />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        {filteredCampaigns.length === 0 && (
                            <Alert type="info">Aucune campagne pour ce groupe.</Alert>
                        )}
                    </>
                ) : (
                    <Alert type="info">Aucune campagne pour le moment.</Alert>
                )}
            </Container>
        </>
    );
}
