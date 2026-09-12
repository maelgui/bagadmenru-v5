import { useQuery } from '@tanstack/react-query';
import Container from '../../components/container';
import Header from '../../components/header';
import { toast } from '@/components/ui/toast';
import { useApiClient } from '../../config/client';
import EmailInviteForm from './components/EmailInviteForm';
import QrInviteCard from './components/QrInviteCard';

/**
 * "Invite a member" page.
 *
 * The primary path matches the real-world flow (showing a phone at rehearsal):
 * a QR code is generated on open and shown large, ready to scan or copy. The
 * new member fills in their own profile.
 *
 * Invitations are single-use, but the token is only consumed when the invitee
 * completes signup — several people scanning in quick succession all capture
 * the same token, so watching for consumption here cannot help them. The
 * inviter hands out a fresh link per person with the "Nouveau lien" button.
 *
 * A secondary, collapsed section (EmailInviteForm) lets the inviter send the
 * invitation by email instead.
 */
export default function InvitationGeneratorPage() {
  const { invitationsApi } = useApiClient();

  // Generate a shareable link/QR as soon as the page opens: zero clicks for the
  // common "scan my phone" case. The token is single-use and short-lived.
  const {
    data: invitation,
    isPending,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['invitation', 'new-link'],
    queryFn: async () => await invitationsApi.createInvitationApiV1InvitationsPost({
      invitationCreate: { channel: 'link' },
    }),
    // A fresh link every visit; don't reuse a cached one.
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const loading = isPending || isRefetching;
  const handleRefetch = () => {
    refetch().catch(() => {
      toast.add({ title: 'Impossible de générer le lien.', type: 'error' });
    });
  };
  const invitationUrl: string | undefined = loading ? undefined : invitation?.url;

  return (
    <>
      <Header
        title="Inviter un membre"
        subtitle="Le nouveau membre remplira lui-même son profil."
        breadcrumb={[
          { title: 'Liste des membres', link: '/profile' },
          { title: 'Inviter un membre' },
        ]}
      />
      <Container>
        <div className="mx-auto max-w-md">
          <QrInviteCard
            loading={loading}
            invitationUrl={invitationUrl}
            onRefetch={handleRefetch}
          />
          <EmailInviteForm />
        </div>
      </Container>
    </>
  );
}
