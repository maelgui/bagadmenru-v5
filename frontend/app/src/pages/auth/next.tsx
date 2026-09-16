import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import RecoveryChooser from './recovery/components/RecoveryChooser';
import SetPasswordForm from './recovery/components/SetPasswordForm';
import type { RecoveryNext } from './recovery/warmSession';
import PasskeyEnrollment from '../../components/PasskeyEnrollment';
import { snoozePasskeyPrompts } from '../../utils/passkeySnooze';

/** Runtime guard: navigation state is untyped (and could be stale/forged). */
function isRecoveryNext(value: unknown): value is RecoveryNext {
  return (
    typeof value === 'object' && value !== null
    && 'accountId' in value && typeof value.accountId === 'string'
    && 'hasPassword' in value && typeof value.hasPassword === 'boolean'
    && 'offerPasskey' in value && typeof value.offerPasskey === 'boolean'
  );
}

// Post-sign-in landing — the embryo of the post-login actions pipeline
// (#1366). The one-shot context arrives in navigation state: it survives a
// reload (history.state) but is absent on a direct visit or in a new tab, in
// which case there is nothing to offer and we go straight home. The state
// only carries display hints; every action behind the screens is enforced
// server-side (session cookie, set_password freshness).
//
// The page owns the funnel: the entry screen is derived from the account
// type (chooser for password accounts, passkey offer for passkey-only ones),
// and `chosen` records the branch a password account picks in the chooser.
function AuthNextPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state: unknown = location.state;
  const next = isRecoveryNext(state) ? state : undefined;
  // Screen chosen inside the chooser (password accounts only). Undefined = no
  // choice made yet: render the entry screen derived from the account type
  // below, so this never freezes a stale value from the first render.
  const [chosen, setChosen] = useState<'passkey' | 'password' | undefined>(undefined);

  if (next === undefined) {
    return <Navigate to="/" replace />;
  }

  const goHome = () => { void navigate('/', { replace: true }); };

  // « Plus tard » : stop offering for a while, including the silent
  // post-login upgrade.
  const later = () => {
    snoozePasskeyPrompts(next.accountId);
    goHome();
  };

  if (chosen === 'password') {
    return <SetPasswordForm onBack={() => setChosen(undefined)} onDone={goHome} />;
  }

  // Passkey-only accounts have no chooser: the passkey offer is their only
  // screen (warmSession lands them here only when a passkey can be offered).
  // Password accounts reach it by picking it in the chooser.
  if (chosen === 'passkey' || !next.hasPassword) {
    return (
      <PasskeyEnrollment
        title="Créez une clé d'accès"
        description="Vous êtes connecté·e. Pour vous reconnecter facilement la prochaine fois, créez une clé d'accès : empreinte, visage ou code de l'appareil."
        skipNote="Sans clé d'accès, vous devrez repasser par un email pour vous reconnecter."
        onEnrolled={goHome}
        onSkip={later}
      />
    );
  }

  return (
    <RecoveryChooser
      offerPasskey={next.offerPasskey}
      onChoosePasskey={() => setChosen('passkey')}
      onChoosePassword={() => setChosen('password')}
      onLater={later}
    />
  );
}

export default AuthNextPage;
