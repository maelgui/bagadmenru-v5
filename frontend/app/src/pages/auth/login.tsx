/* eslint-disable react/jsx-props-no-spreading */
import {
  PublicKeyCredentialRequestOptionsJSON, startAuthentication,
  WebAuthnError,
} from '@simplewebauthn/browser';
import { LoginType, ResponseError } from 'bagad-client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../config/client';
import useCachedProfile from '../../hooks/useCachedProfile';
import { useProfileStore } from '../../utils/authStore';
import LoginFormComponent from './forms/login';

function AuthPage() {
  const { authApi, usersApi } = useApiClient();
  const { setAccount } = useProfileStore();
  const { cacheProfile, profileData, loaded } = useCachedProfile();

  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);

  const navigate = useNavigate();

  const postLogin = async (loginType: LoginType) => {
    const res = await usersApi.getMyProfileApiV1ProfilesMeGet();

    setAccount(res);
    cacheProfile(res, loginType);
    if (res.pictureUrl) {
      // download and save image
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
      // setErrorMsg(`Email inconnue : ${error}`);
    }
  };

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

  if (!loaded) {
    return null;
  }

  const t = profileData?.loginType
    ? [profileData.loginType]
    : [LoginType.Passkey, LoginType.Password];

  return (
    <LoginFormComponent
      onSubmit={onSubmit}
      errorMsg={errorMsg}
      startPasskeyLogin={startPasskeyLogin}
      existingProfileData={profileData}
      loginTypes={t}
    />
  );
}

export default AuthPage;
