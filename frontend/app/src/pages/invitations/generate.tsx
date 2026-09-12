import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import Container from '../../components/container';
import Header from '../../components/header';
import { toast } from '@/components/ui/toast';
import { useApiClient } from '../../config/client';
import EmailInviteForm from './components/EmailInviteForm';
import QrInviteCard from './components/QrInviteCard';

// How often to check whether the displayed invitation has been consumed.
const INVITATION_STATUS_POLL_MS = 5000;

/**
 * "Invite a member" page.
 *
 * The primary path matches the real-world flow (showing a phone at rehearsal):
 * a QR code is generated on open and shown large, ready to scan or copy. The
 * new member fills in their own profile.
 *
 * Invitations are single-use, and at a rehearsal several people may scan one
 * after the other: the page polls the displayed invitation and mints a fresh
 * QR automatically as soon as the current one has been used, so the inviter
 * never shows a dead link.
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
  const handleRefetch = useCallback(() => {
    refetch().catch(() => {
      toast.add({ title: 'Impossible de générer le lien.', type: 'error' });
    });
  }, [refetch]);
  const invitationUrl: string | undefined = loading ? undefined : invitation?.url;
  const token = loading ? undefined : invitation?.token;

  // Watch the displayed invitation while the page is open (polling pauses in
  // background tabs by default). The public GET starts returning 404 the moment
  // the invitation is consumed (or expires), flipping this query to its error
  // state — the signal to mint a fresh link.
  const { isError: invitationGone } = useQuery({
    queryKey: ['invitation', 'status', token],
    queryFn: async () => await invitationsApi.getInvitationApiV1InvitationsTokenGet({ token: token ?? '' }),
    enabled: token !== undefined,
    refetchInterval: INVITATION_STATUS_POLL_MS,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // One regeneration per consumed token: the effect re-runs on unrelated
  // renders while `invitationGone` is still true, so guard with the token.
  const handledTokenRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (invitationGone && token !== undefined && handledTokenRef.current !== token) {
      handledTokenRef.current = token;
      toast.add({ title: 'Lien utilisé — un nouveau QR code a été généré.', type: 'success' });
      handleRefetch();
    }
  }, [invitationGone, token, handleRefetch]);

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
