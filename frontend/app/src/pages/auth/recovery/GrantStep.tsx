import {
  Navigate, useNavigate, useParams, useSearchParams,
} from 'react-router-dom';
import CodeEntry from './components/CodeEntry';
import ResetHeader from './components/ResetHeader';
import type { RecoveryNext } from './warmSession';

/**
 * Step route /auth/reset/:grantId: the email is sent. Type the emailed code —
 * the emailed link (?code=) is the same form prefilled and auto-submitted.
 * A successful sign-in leaves the funnel by plain navigation: home when
 * there is nothing to offer, /auth/next otherwise with the one-shot context
 * in navigation state — the consumed grant drops out of the URL either way.
 */
export default function GrantStep() {
  const navigate = useNavigate();
  const { grantId } = useParams<'grantId'>();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');

  const onSignedIn = (next: RecoveryNext | null) => {
    if (next === null) {
      void navigate('/', { replace: true });
      return;
    }
    void navigate('/auth/next', { replace: true, state: next });
  };

  if (grantId === undefined) {
    return <Navigate to="/auth/reset" replace />;
  }

  return (
    <div>
      <ResetHeader />
      <div className="mb-6">
        Un email vous a été envoyé. Suivez ses instructions pour retrouver
        l&apos;accès à votre compte.
      </div>
      <CodeEntry
        grantId={grantId}
        initialCode={code ?? undefined}
        onSignedIn={onSignedIn}
      />
    </div>
  );
}
