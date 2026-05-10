
import { faKey } from '@fortawesome/free-solid-svg-icons';
import {
  browserSupportsWebAuthn, type PublicKeyCredentialRequestOptionsJSON, startAuthentication,
  WebAuthnError,
} from '@simplewebauthn/browser';
import { LoginType, ResponseError } from 'bagad-client';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import iconPasskeyWhite from '../../assets/passkeys/FIDO_Passkey_mark_A_white.svg';
import Alert from '../../components/alert';
import Button from '../../components/button';
import Input from '../../components/input';
import { queryClient, useApiClient } from '../../config/client';

const HTTP_UNAUTHORIZED = 401;

function AuthPage() {
  const { authApi, usersApi } = useApiClient();

  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<{ email: string, password: string }>();

  const navigate = useNavigate();

  const postLogin = useCallback(async () => {
    const res = await usersApi.getMyProfileApiV1ProfilesMeGet();

    queryClient.setQueryData(['profiles', 'me'], res);
    void navigate('/');
  }, [navigate, usersApi]);
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
      // Some basic error handling

      console.error(error);
      setErrorMsg(`Email inconnue : ${String(error)}`);
    }
  }, [authApi, postLogin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Passkey conditional login must be initiated on mount; it may set error state on failure which is acceptable here
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
      await postLogin();
    } catch (error) {
      if (error instanceof ResponseError) {
        if (error.response.status === HTTP_UNAUTHORIZED) {
          setErrorMsg('Email ou mot de passe incorrect.');
        } else {
          setErrorMsg(`Erreur inconnue, veillez réessayer plus tard : ${error.message}`);
        }
      }
    }
  };

  return (
    <div>
      <h1 className="text-2xl mb-2">Connexion</h1>
      <p className="text-gray-500 mb-8">Connectez-vous à votre compte</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={isSubmitting}>
          {errorMsg ? <Alert type="error">{errorMsg}</Alert> : null}
          <div className="mb-6">
            <label className="mb-2 block font-semibold" htmlFor="email">Email</label>
            <Input
              type="email"
              id="email"
              error={errors.email?.message}
              {...register('email', { required: 'Ce champ est obligatoire.' })}
              autoComplete="email webauthn"
            />
          </div>
          <div className="mb-6">
            <label className="mb-2 block font-semibold" htmlFor="password">Mot de passe</label>
            <Input
              type="password"
              id="password"
              error={errors.password?.message}
              {...register('password', { required: 'Ce champ est obligatoire.' })}
            />
          </div>
          <div className="flex justify-between">
            <Button as={Link} to="/auth/reset" type="button" variant="ghost">Mot de passe oublié</Button>
            <Button type="submit" icon={faKey} isLoading={isSubmitting}>
              Connexion
            </Button>
          </div>
        </fieldset>
      </form>
      {browserSupportsWebAuthn() ? (
        <>
          <div className="my-12 text-gray-500 flex items-center before:mr-3 before:block before:grow  before:h-px before:bg-gray-300 after:block after:grow after:h-px after:bg-gray-300 after:ml-3">Ou</div>
          <Button type="button" onClick={async () => await startPasskeyLogin(false)} className="block w-full">
            <span className="pr-3"><img src={iconPasskeyWhite} alt="passkey logo" className="h-6 inline" /></span>
            Passkey
          </Button>
        </>
      ) : null}
    </div>
  );
}

export default AuthPage;
