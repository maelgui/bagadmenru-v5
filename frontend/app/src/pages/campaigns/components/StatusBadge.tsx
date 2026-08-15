import Badge from '../../../components/badge';

type CampaignStatus = 'draft' | 'active' | 'archived';

const statusConfig: Record<CampaignStatus, { label: string; variant: 'muted' | 'success' | 'warning' }> = {
    draft: { label: 'Brouillon', variant: 'muted' },
    active: { label: 'Active', variant: 'success' },
    archived: { label: 'Archivée', variant: 'warning' },
};

function isCampaignStatus(status: string): status is CampaignStatus {
    return status in statusConfig;
}

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = isCampaignStatus(status)
        ? statusConfig[status]
        : { label: status, variant: 'muted' as const };

    return (
        <Badge variant={config.variant} className={className}>
            {config.label}
        </Badge>
    );
}

export type { CampaignStatus };
