import { useMutation } from '@tanstack/react-query';
import type { LoginCodeViaEnum } from 'bagad-client';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { warmSessionAfterRecovery, type RecoveryNext } from '../warmSession';
import { useApiClient } from '../../../../config/client';

export const OTP_LENGTH = 6;

/**
 * The 6-digit code entry shown once the recovery email is sent.
 *
 * The grant id (returned by the request, also carried in the emailed link)
 * publicly identifies the recovery request; the emailed code is the secret.
 * The emailed link is this very form prefilled (`initialCode`, RFC 8628's
 * verification_uri_complete pattern) and submitted automatically — one
 * component, two ways to fill it. On success the member is signed in in
 * THIS tab and `onSignedIn` fires with what the landing should offer
 * (`null` = nothing); routing is the page's call.
 */
export default function CodeEntry({
  grantId,
  initialCode,
  onSignedIn,
}: {
  grantId: string;
  /** Code carried by the emailed link: submitted automatically on arrival. */
  initialCode?: string;
  onSignedIn: (next: RecoveryNext | null) => void;
}) {
  const { authApi, usersApi } = useApiClient();
  const [code, setCode] = useState(initialCode ?? '');
  // autoFocus only on non-touch (desktop): on mobile it can pop the keyboard
  // and jump the scroll before the user has read the screen.
  const autoFocusOtp = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: fine)').matches;

  const signIn = useMutation({
    mutationFn: async ({ submitted, via }: { submitted: string; via?: LoginCodeViaEnum }) => {
      await authApi.loginWithCodeApiV1AuthLoginCodePost({
        loginCode: { grantId, code: submitted, via },
      });
      return await warmSessionAfterRecovery(usersApi);
    },
    onSuccess: onSignedIn,
  });

  const onSubmitCode = (submitted: string) => {
    if (submitted.length < OTP_LENGTH || signIn.isPending) return;
    signIn.mutate({ submitted });
  };

  // Submit the emailed link's code exactly once on arrival. The ref guards
  // StrictMode's dev-only double effect — the grant is single-use, a second
  // POST would 403 right after the successful sign-in.
  const fired = useRef(false);
  const { mutate } = signIn;
  useEffect(() => {
    if (fired.current || initialCode?.length !== OTP_LENGTH) return;
    fired.current = true;
    mutate({ submitted: initialCode, via: 'link' });
  }, [initialCode, mutate]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmitCode(code);
      }}
      className="mb-6 flex flex-col items-center gap-4 rounded-lg border p-4"
    >
      <p className="text-sm text-muted-foreground">
        Vous avez reçu un code ? Saisissez-le ici pour vous connecter.
      </p>
      <InputOTP
        maxLength={OTP_LENGTH}
        value={code}
        onChange={setCode}
        // Submit automatically once all digits are entered.
        onComplete={onSubmitCode}
        autoFocus={autoFocusOtp && initialCode === undefined}
      >
        <InputOTPGroup>
          {Array.from({ length: OTP_LENGTH }, (_, i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {signIn.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {/* Uniform 403 server-side (wrong code, expired or superseded
              grant, dead link): one recoverable message covers them all. */}
          Code incorrect ou expiré. Vérifiez le code, ou{' '}
          <Link to="/auth/reset" className="underline">demandez un nouvel email</Link>.
        </p>
      ) : null}
      <Button
        type="submit"
        className="w-full"
        disabled={signIn.isPending || code.length < OTP_LENGTH}
      >
        {signIn.isPending && <Spinner data-icon="inline-start" />}
        Se connecter
      </Button>
    </form>
  );
}
