/* eslint-disable react/jsx-props-no-spreading */
import { faKey } from '@fortawesome/free-solid-svg-icons';
import {
  browserSupportsWebAuthn, PublicKeyCredentialRequestOptionsJSON, startAuthentication,
  WebAuthnError,
} from '@simplewebauthn/browser';
import { LoginType, ResponseError } from 'bagad-client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import iconPasskeyWhite from '../../assets/passkeys/FIDO_Passkey_mark_A_white.svg';
import Alert from '../../components/alert';
import Avatar from '../../components/avatar';
import Button from '../../components/button';
import Input from '../../components/input';
import { useApiClient } from '../../config/client';
import useCachedProfile from '../../hooks/useCachedProfile';
import { useProfileStore } from '../../utils/authStore';

function AuthPage() {
  const { authApi, usersApi } = useApiClient();
  const { setAccount } = useProfileStore();
  const { cacheProfile, profileData, profileImage } = useCachedProfile();

  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<{ email: string, password: string }>();

  const navigate = useNavigate();

  const postLogin = async (loginType: LoginType) => {
    const res = await usersApi.getMyProfileApiV1ProfilesMeGet();

    setAccount(res);
    localStorage.setItem('last-authenticated-user', JSON.stringify(res));
    if (res.pictureUrl) {
      // download and save image
      cacheProfile(res, loginType);
    }
    navigate('/');
  };
  const startPasskeyLogin = async (conditional: boolean) => {
    try {
      // eslint-disable-next-line max-len
      const opt = await authApi.prepareLoginApiV1AuthLoginGet() as PublicKeyCredentialRequestOptionsJSON;
      const res = await startAuthentication({ optionsJSON: opt, useBrowserAutofill: conditional });
      await authApi.processLoginApiV1AuthLoginPost({
        loginData: {
          type: LoginType.Passkey,
          passkey: JSON.stringify(res),
        },
      });
      await postLogin(LoginType.Passkey);
    } catch (error) {
      if (error instanceof WebAuthnError && error.name === 'AbortError') {
        return;
      }
      // Some basic error handling
      // eslint-disable-next-line no-console
      console.error(error);
      setErrorMsg(`Email inconnue : ${error}`);
    }
  };

  useEffect(() => {
    startPasskeyLogin(true);
  }, []);

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
      await postLogin(LoginType.Password);
    } catch (error) {
      if (error instanceof ResponseError) {
        if (error.response.status === 401) {
          setErrorMsg('Email ou mot de passe incorrect.');
        } else {
          setErrorMsg(`Erreur inconnue, veillez réessayer plus tard : ${error.message}`);
        }
      }
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={isSubmitting}>
          {errorMsg ? <Alert type="error">{errorMsg}</Alert> : null}
          {profileData ? (
            <div className="flex flex-col items-center">
              <Avatar src={profileImage} size="sm" />
              <input
                type="hidden"
                id="email"
                {...register('email')}
              />
              <span className="font-semibold mt-8 mb-16">{`${profileData.firstName} ${profileData.lastName.substring(0, 1)}.`}</span>
            </div>
          ) : (
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
          )}
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
          <div className="my-12 text-gray-500 flex items-center before:mr-3 before:block before:flex-grow  before:h-px before:bg-gray-300 after:block after:flex-grow after:h-px after:bg-gray-300 after:ml-3">Ou</div>
          <Button type="button" onClick={() => startPasskeyLogin(false)} className="block w-full">
            <span className="pr-3"><img src={iconPasskeyWhite} alt="passkey logo" className="h-6 inline" /></span>
            Passkey
          </Button>
        </>
      ) : null}
    </div>
  );
}

export default AuthPage;
