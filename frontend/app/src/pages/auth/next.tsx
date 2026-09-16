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
// The page owns the whole funnel state and mounts one simple component per
// screen: the chooser (password accounts), the passkey enrollment — sole
// owner of the ceremony everywhere — or the new-password form.
function AuthNextPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state: unknown = location.state;
  const next = isRecoveryNext(state) ? state : undefined;
  // Passkey-only accounts skip the chooser: the passkey offer is the only
  // screen (warmSession only lands them here when a passkey can be offered).
  const [mode, setMode] = useState<'choose' | 'passkey' | 'password'>(
    next?.hasPassword === true ? 'choose' : 'passkey',
  );

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

  if (mode === 'password') {
    return <SetPasswordForm onBack={() => setMode('choose')} onDone={goHome} />;
  }

  if (mode === 'passkey') {
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
      onChoosePasskey={() => setMode('passkey')}
      onChoosePassword={() => setMode('password')}
      onLater={later}
    />
  );
}

export default AuthNextPage;
