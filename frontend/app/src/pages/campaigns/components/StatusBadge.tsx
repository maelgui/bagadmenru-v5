import { Badge } from '@/components/ui/badge';

type CampaignStatus = 'draft' | 'active' | 'archived';

const statusConfig: Record<
  CampaignStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  archived: { label: 'Archivée', variant: 'outline' },
};

function isCampaignStatus(status: string): status is CampaignStatus {
  return status in statusConfig;
}

export default function StatusBadge({ status }: { status: string }) {
  const config = isCampaignStatus(status)
    ? statusConfig[status]
    : { label: status, variant: 'secondary' as const };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export type { CampaignStatus };
