import { WandSparkles } from 'lucide-react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import type { ResetPassword } from 'bagad-client';
import { ResponseError } from 'bagad-client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import PasswordField from '../../components/PasswordField';
import PasskeyEnrollment from '../invitations/PasskeyEnrollment';
import { queryClient, useApiClient } from '../../config/client';
import { extractErrorMessage } from '../../utils/errors';
import { isPasskeySnoozed, snoozePasskeyPrompts } from '../../utils/passkeySnooze';
import { cn } from '@/lib/utils';

const HTTP_FORBIDDEN = 403;

// The reset flow signs the member in, so it can end on the same passkey offer
// as the invitation signup (FIDO "account recovery" pattern: someone who just
// lost a password is the most receptive audience for passwordless sign-in).
type Step = 'form' | 'enroll' | 'done';

function ChangePasswordPage() {
  const { authApi, usersApi } = useApiClient();
  const { token } = useParams<'token'>();
  const navigate = useNavigate();
  const {
    register, handleSubmit, getValues, formState: { errors, isSubmitting },
  } = useForm<ResetPassword>();
  // Success is tracked explicitly rather than via isSubmitSuccessful: onSubmit
  // swallows API errors (to display them), which would otherwise mark the
  // submission successful and show the success screen on failure.
  const [step, setStep] = useState<Step>('form');
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
  // A 403 means the token was rejected (expired, already used, or malformed):
  // retrying with the same link is pointless, so guide the user to a new one.
  const [tokenRejected, setTokenRejected] = useState(false);

  if (token === undefined) {
    return null;
  }

  const onSubmit = async (data: ResetPassword) => {
    setErrorMsg(undefined);
    try {
      await authApi.resetPasswordApiV1AuthResetPost({ resetPassword: data, token });
      // The reset signed us in (additive session cookies, now the active
      // account): reset the cache like a login and warm the new profile.
      queryClient.clear();
      try {
        const me = await usersApi.getMyProfileApiV1ProfilesMeGet();
        queryClient.setQueryData(['profiles', 'me'], me);
        setAccountId(me.id);
        setStep(
          browserSupportsWebAuthn() && !isPasskeySnoozed(me.id) ? 'enroll' : 'done',
        );
      } catch {
        // Signed in but could not warm the profile: skip the passkey offer.
        setStep('done');
      }
    } catch (error) {
      if (error instanceof ResponseError && error.response.status === HTTP_FORBIDDEN) {
        setTokenRejected(true);
        setErrorMsg('Ce lien est invalide, a expiré ou a déjà été utilisé.');
      } else {
        setErrorMsg(await extractErrorMessage(error, 'Une erreur est survenue. Veuillez réessayer.'));
      }
    }
  };

  if (step === 'enroll') {
    return (
      <PasskeyEnrollment
        onEnrolled={() => { void navigate('/'); }}
        onSkip={() => {
          // « Plus tard » (or giving up after a failure): stop offering for a
          // while, including the silent post-login upgrade.
          if (accountId !== undefined) snoozePasskeyPrompts(accountId);
          void navigate('/');
        }}
      />
    );
  }

  if (step === 'done') {
    return (
      <div>
        <h1 className="mb-2 text-2xl">Changer le mot de passe</h1>
        <div className="mb-6">Mot de passe changé avec succès !</div>
        <Link to="/" className={cn(buttonVariants())}>Accéder à mon espace</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl">Changer le mot de passe</h1>
      <p className="mb-8 text-muted-foreground">Choisissez un nouveau mot de passe</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" id="email" {...register('email')} />
        <FieldGroup>
          {errorMsg ? (
            <Alert variant="destructive">
              <AlertTitle>Impossible de changer le mot de passe</AlertTitle>
              <AlertDescription>
                {errorMsg}
                {tokenRejected ? (
                  <>
                    {' '}
                    <Link to="/auth/reset" className="underline">
                      Demander un nouveau lien
                    </Link>
                  </>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
          <PasswordField
            id="password"
            label="Mot de passe"
            error={errors.password?.message}
            autoComplete="new-password"
            registration={register('password', { required: 'Ce champ est obligatoire.' })}
          />
          <PasswordField
            id="passwordConfirm"
            label="Confirmation"
            error={errors.passwordConfirm?.message}
            autoComplete="new-password"
            registration={register('passwordConfirm', {
              required: 'Ce champ est obligatoire.',
              validate: (value) => value === getValues('password') || 'Les mots de passe ne correspondent pas.',
            })}
          />
          <div className="flex justify-between">
            <Link to="/auth/login" className={cn(buttonVariants({ variant: 'ghost' }))}>Retour</Link>
            <Button type="submit" disabled={isSubmitting}>
              <WandSparkles data-icon="inline-start" />
              Changer
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}

export default ChangePasswordPage;
