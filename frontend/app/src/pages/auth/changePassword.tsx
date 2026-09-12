import { WandSparkles } from 'lucide-react';
import type { ResetPassword } from 'bagad-client';
import { ResponseError } from 'bagad-client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import PasswordField from '../../components/PasswordField';
import { useApiClient } from '../../config/client';
import { extractErrorMessage } from '../../utils/errors';
import { cn } from '@/lib/utils';

const HTTP_FORBIDDEN = 403;

function ChangePasswordPage() {
  const { authApi } = useApiClient();
  const { token } = useParams<'token'>();
  const {
    register, handleSubmit, getValues, formState: { errors, isSubmitting },
  } = useForm<ResetPassword>();
  // Success is tracked explicitly rather than via isSubmitSuccessful: onSubmit
  // swallows API errors (to display them), which would otherwise mark the
  // submission successful and show the success screen on failure.
  const [done, setDone] = useState(false);
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
      setDone(true);
    } catch (error) {
      if (error instanceof ResponseError && error.response.status === HTTP_FORBIDDEN) {
        setTokenRejected(true);
        setErrorMsg('Ce lien est invalide, a expiré ou a déjà été utilisé.');
      } else {
        setErrorMsg(await extractErrorMessage(error, 'Une erreur est survenue. Veuillez réessayer.'));
      }
    }
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl">Changer le mot de passe</h1>
      <p className="mb-8 text-muted-foreground">Choisissez un nouveau mot de passe</p>
      {done ? (
        <>
          <div className="mb-6">Mot de passe changé avec succès !</div>
          <Link to="/auth/login" className={cn(buttonVariants())}>Se connecter</Link>
        </>
      ) : (
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
      )}
    </div>
  );
}

export default ChangePasswordPage;
