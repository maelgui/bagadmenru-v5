import {
  browserSupportsWebAuthn, type PublicKeyCredentialRequestOptionsJSON, startAuthentication,
  WebAuthnError,
} from '@simplewebauthn/browser';
import { KeyRound } from 'lucide-react';
import { LoginType, ResponseError } from 'bagad-client';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PasskeyIcon from '../../components/PasskeyIcon';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import PasswordField from '../../components/PasswordField';
import { queryClient, useApiClient } from '../../config/client';
import { attemptSilentPasskeyUpgrade } from '../../utils/usePasskey';
import { cn } from '@/lib/utils';

const HTTP_UNAUTHORIZED = 401;

function AuthPage() {
  const { authApi, usersApi } = useApiClient();
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<{ email: string, password: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const postLogin = useCallback(async () => {
    // A login makes a (possibly different) account active, so treat it like an
    // account switch: clear the whole query cache first so no data from a
    // previously active account lingers (cache isolation), then warm the new
    // account's profile. Everything else refetches under the new session.
    queryClient.clear();
    const res = await usersApi.getMyProfileApiV1ProfilesMeGet();
    queryClient.setQueryData(['profiles', 'me'], res);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- location.state is set by AuthGuard
    const from = (location.state as { from?: string } | null)?.from;
    void navigate(from ?? '/', { replace: true });
    return res.id;
  }, [navigate, usersApi, location.state]);

  const startPasskeyLogin = useCallback(async (conditional: boolean) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- The API response matches PublicKeyCredentialRequestOptionsJSON but the generated client types it as object
      const opt = await authApi.prepareLoginApiV1AuthLoginGet() as PublicKeyCredentialRequestOptionsJSON;
      const res = await startAuthentication({ optionsJSON: opt, useBrowserAutofill: conditional });
      await authApi.processLoginApiV1AuthLoginPost({
        loginData: {
          type: LoginType.Passkey,
          passkey: JSON.stringify(res),
        },
      });
      await postLogin();
    } catch (error) {
      if (error instanceof WebAuthnError && error.name === 'AbortError') {
        return;
      }
      console.error(error);
      // Conditional (autofill) login runs silently on mount; only surface an
      // error when the user explicitly clicked the Passkey button.
      if (!conditional) {
        setErrorMsg('La connexion par clé d\'accès a échoué. Veuillez réessayer ou utiliser votre mot de passe.');
      }
    }
  }, [authApi, postLogin]);

  useEffect(() => {
    if (!browserSupportsWebAuthn()) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts the WebAuthn conditional (autofill) login, an external async operation; state is only set asynchronously in its error handler
    void startPasskeyLogin(true);
  }, [startPasskeyLogin]);

  const onSubmit = async (data: { email: string, password: string }) => {
    setErrorMsg(undefined);
    try {
      await authApi.processLoginApiV1AuthLoginPost({
        loginData: {
          type: LoginType.Password,
          email: data.email,
          password: data.password,
        },
      });
      const accountId = await postLogin();
      // Fire-and-forget silent passkey upgrade (WebAuthn conditional create):
      // only after a *password* login — a passkey login proves the account
      // already has one for this context. Never blocks navigation. The helper
      // is gated to beta + local dev and reports post-creation registration
      // failures to Sentry (see usePasskey.ts).
      void attemptSilentPasskeyUpgrade(authApi, accountId);
    } catch (error) {
      if (error instanceof ResponseError) {
        if (error.response.status === HTTP_UNAUTHORIZED) {
          setErrorMsg('Email ou mot de passe incorrect.');
        } else {
          setErrorMsg(`Erreur inconnue, veuillez réessayer plus tard : ${error.message}`);
        }
      }
    }
  };

  return (
    <div>
      <h1 className="mb-2 text-3xl">Connexion</h1>
      <p className="mb-8 text-muted-foreground">Connectez-vous à votre compte</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={isSubmitting}>
          <FieldGroup>
            {errorMsg ? (
              <Alert variant="destructive">
                <AlertTitle>Erreur de connexion</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            ) : null}
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                type="email"
                id="email"
                aria-invalid={!!errors.email}
                {...register('email', { required: 'Ce champ est obligatoire.' })}
                autoComplete="email webauthn"
              />
              <FieldError>{errors.email?.message}</FieldError>
            </Field>
            <PasswordField
              id="password"
              label="Mot de passe"
              error={errors.password?.message}
              autoComplete="current-password"
              registration={register('password', { required: 'Ce champ est obligatoire.' })}
            />
            <div className="flex justify-between">
              <Link to="/auth/reset" className={cn(buttonVariants({ variant: 'ghost' }))}>Mot de passe oublié</Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner data-icon="inline-start" /> : <KeyRound data-icon="inline-start" />}
                Connexion
              </Button>
            </div>
          </FieldGroup>
        </fieldset>
      </form>
      {browserSupportsWebAuthn() ? (
        <>
          <div className="my-12 flex items-center text-muted-foreground before:mr-3 before:block before:h-px before:grow before:bg-border after:ml-3 after:block after:h-px after:grow after:bg-border">Ou</div>
          <Button type="button" onClick={async () => await startPasskeyLogin(false)} className="w-full">
            <PasskeyIcon className="size-6" />
            Clé d&apos;accès
          </Button>
        </>
      ) : null}
    </div>
  );
}

export default AuthPage;
