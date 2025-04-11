/* eslint-disable react/jsx-props-no-spreading */
import { faKey } from '@fortawesome/free-solid-svg-icons';
import {
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import { LoginType } from 'bagad-client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import iconPasskeyWhite from '../../../assets/passkeys/FIDO_Passkey_mark_A_white.svg';
import Alert from '../../../components/alert';
import Avatar from '../../../components/avatar';
import Button from '../../../components/button';
import Input from '../../../components/input';
import { CachedProfile } from '../../../hooks/useCachedProfile';

interface LoginFormComponentProps {
  onSubmit: (data: { email: string, password: string }) => void;
  startPasskeyLogin: (conditional: boolean) => void;
  errorMsg: string | undefined;
  existingProfileData: CachedProfile | undefined
  loginTypes: LoginType[]
}

function LoginFormComponent({
  onSubmit, startPasskeyLogin, errorMsg, existingProfileData, loginTypes,
}: LoginFormComponentProps) {
  useEffect(() => {
    startPasskeyLogin(true);
  }, []);

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<{ email: string, password: string }>(
    { values: existingProfileData ? { email: existingProfileData.data.email, password: '' } : undefined },
  );

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        {errorMsg ? <Alert type="error">{errorMsg}</Alert> : null}
        {existingProfileData ? (

          <>
            <div className="flex flex-col items-center">
              <Avatar src={existingProfileData?.image} size="sm" />
              <span className="font-semibold mt-8 mb-16">{`${existingProfileData.data.firstName} ${existingProfileData.data.lastName.substring(0, 1)}.`}</span>
            </div>
            <div className="flex items-center px-6 py-4 bg-gray-100 border-2 border-gray-200 mt-8 mb-16 rounded-lg">
              <Avatar src={existingProfileData?.image} size="xs" className="mr-6" />
              <span className="font-semibold">{`${existingProfileData.data.firstName} ${existingProfileData.data.lastName.substring(0, 1)}.`}</span>
            </div>
          </>
        ) : null}
        {loginTypes.includes(LoginType.Password) ? (
          <fieldset disabled={isSubmitting}>
            <div className={`mb-6 ${existingProfileData ? 'hidden' : ''}`}>
              <label className="mb-2 block font-semibold" htmlFor="email">Email</label>
              <Input
                type={existingProfileData ? 'hidden' : 'email'}
                id="email"
                error={errors.email?.message}
                {...register('email', { required: 'Ce champ est obligatoire.', value: existingProfileData?.data.email })}
                autoComplete="email webauthn"
              />
              {errors.email?.message}
            </div>
            <div className="mb-6">
              <label className="mb-2 block font-semibold" htmlFor="password">Mot de passe</label>
              <Input
                type="password"
                id="password"
                error={errors.password?.message}
                {...register('password', { required: 'Ce champ est obligatoire.' })}
              />
              <Link to="/auth/reset" className="my-4 hover:underline hover:underline-offset-4">Mot de passe oublié</Link>
            </div>
            <div>
              <Button type="submit" icon={faKey} isLoading={isSubmitting} className="block w-full">
                Connexion
              </Button>
            </div>
          </fieldset>
        ) : null}
      </form>
      {loginTypes.length > 1 ? <div className="my-12 text-gray-500 flex items-center before:mr-3 before:block before:flex-grow  before:h-px before:bg-gray-300 after:block after:flex-grow after:h-px after:bg-gray-300 after:ml-3">Ou</div> : null}
      {browserSupportsWebAuthn() && loginTypes.includes(LoginType.Passkey) ? (
        <Button type="button" onClick={() => startPasskeyLogin(false)} className="block w-full">
          <span className="pr-3"><img src={iconPasskeyWhite} alt="passkey logo" className="h-6 inline" /></span>
          Passkey
        </Button>
      ) : null}
    </div>
  );
}

export default LoginFormComponent;
