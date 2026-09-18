import {
  type AuthenticationResponseJSON,
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
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import PasswordField from '../../components/PasswordField';
import { queryClient, useApiClient } from '../../config/client';
import { attemptSilentPasskeyUpgrade, signalUnknownPasskey } from '../../utils/usePasskey';

const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;

/**
 * Outcome of a passkey login ceremony.
 * - `logged-in`: success, navigation to the app is underway.
 * - `restart`: the ceremony was consumed by a user gesture without logging
 *   in — the conditional (autofill) request must be re-armed.
 * - `stop`: aborted by our own code or failed without a user gesture; do not
 *   re-arm (it would loop).
 */
type PasskeyLoginOutcome = 'logged-in' | 'restart' | 'stop';

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

  /**
   * Run one passkey ceremony (conditional autofill or explicit modal).
   *
   * The outcome tells the caller whether the conditional (autofill) request
   * needs re-arming: a `navigator.credentials.get({mediation:'conditional'})`
   * call is single-use — once the user picks a passkey it is consumed, even
   * if they then cancel the OS dialog or the server rejects the assertion.
   * Without a restart, passkey suggestions silently stop appearing until a
   * full page reload.
   */
  const startPasskeyLogin = useCallback(async (conditional: boolean): Promise<PasskeyLoginOutcome> => {
    let opt: PublicKeyCredentialRequestOptionsJSON | undefined = undefined;
    let res: AuthenticationResponseJSON | undefined = undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- The API response matches PublicKeyCredentialRequestOptionsJSON but the generated client types it as object
      opt = await authApi.prepareLoginApiV1AuthLoginGet() as PublicKeyCredentialRequestOptionsJSON;
      res = await startAuthentication({ optionsJSON: opt, useBrowserAutofill: conditional });
      await authApi.processLoginApiV1AuthLoginPost({
        loginData: {
          type: LoginType.Passkey,
          passkey: JSON.stringify(res),
        },
      });
      await postLogin();
      return 'logged-in';
    } catch (error) {
      if (error instanceof WebAuthnError && error.name === 'AbortError') {
        // Aborted by our own code: a newer ceremony is already replacing
        // this one, nothing to re-arm.
        return 'stop';
      }
      if (error instanceof ResponseError && error.response.status === HTTP_NOT_FOUND) {
        // The passkey was deleted server-side while the user's provider kept
        // its copy: signal the provider to drop the orphan.
        await signalUnknownPasskey(opt, res);
        if (!conditional) {
          setErrorMsg('Cette clé d\'accès n\'est plus reconnue par le site. Utilisez une autre méthode de connexion ci-dessous.');
        }
        return 'restart';
      }
      if (conditional) {
        // NotAllowedError: the user picked a passkey in the autofill dialog
        // then cancelled the OS prompt. A deliberate, silent dismissal — but
        // the ceremony is consumed, so ask for a re-arm. Anything else
        // (browser without conditional UI, network failure…) must NOT
        // restart: it would loop without any user gesture as a brake.
        if (error instanceof WebAuthnError && error.name === 'NotAllowedError') {
          return 'restart';
        }
        console.error(error);
        return 'stop';
      }
      console.error(error);
      // Conditional (autofill) login runs silently on mount; this branch is
      // the explicit button flow.
      setErrorMsg('La connexion par clé d\'accès a échoué. Réessayez ou utilisez une autre méthode ci-dessous.');
      return 'restart';
    }
  }, [authApi, postLogin]);

  /**
   * Arm the conditional (autofill) passkey request and keep it armed: a
   * `restart` outcome normally follows a user gesture (picking a passkey in
   * the autofill dialog), so the loop cannot spin on its own. As a safety
   * net, a ceremony that ends near-instantly (no gesture fits in < 1s) is
   * never re-armed.
   */
  const armConditionalLogin = useCallback(async () => {
    const MIN_GESTURE_MS = 1000;
    for (;;) {
      const startedAt = Date.now();
      const outcome = await startPasskeyLogin(true);
      if (outcome !== 'restart' || Date.now() - startedAt < MIN_GESTURE_MS) {
        return;
      }
    }
  }, [startPasskeyLogin]);

  useEffect(() => {
    if (!browserSupportsWebAuthn()) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts the WebAuthn conditional (autofill) login, an external async operation; state is only set asynchronously in its error handler
    void armConditionalLogin();
  }, [armConditionalLogin]);

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
                // Dedicated login page: focusing the webauthn-annotated field
                // at load opens the autofill prompt (passkeys + passwords)
                // immediately, per the web.dev passkey-form-autofill guidance.
                autoFocus
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
            <div className="flex justify-end">
              <Link to="/auth/reset" className="text-sm text-muted-foreground underline-offset-4 hover:underline">Impossible de vous connecter&nbsp;?</Link>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner data-icon="inline-start" /> : <KeyRound data-icon="inline-start" />}
              Connexion
            </Button>
          </FieldGroup>
        </fieldset>
      </form>
      {browserSupportsWebAuthn() ? (
        <>
          <div className="my-12 flex items-center text-muted-foreground before:mr-3 before:block before:h-px before:grow before:bg-border after:ml-3 after:block after:h-px after:grow after:bg-border">Ou</div>
          <Button
            type="button"
            onClick={async () => {
              // The explicit modal ceremony aborts the pending conditional
              // request (only one get() at a time): re-arm it if the modal
              // flow ends without a login.
              if (await startPasskeyLogin(false) === 'restart') {
                void armConditionalLogin();
              }
            }}
            className="w-full"
          >
            <PasskeyIcon className="size-6" />
            Clé d&apos;accès
          </Button>
        </>
      ) : null}
    </div>
  );
}

export default AuthPage;
