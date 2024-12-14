/* eslint-disable react/jsx-props-no-spreading */
import { faKey } from '@fortawesome/free-solid-svg-icons';
import { LoginType, ResponseError } from 'bagad-client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../../components/alert';
import Button from '../../components/button';
import Input from '../../components/input';
import { useApiClient } from '../../config/client';
import { useProfileStore } from '../../utils/authStore';

function AuthPage() {
  const { authApi, usersApi } = useApiClient();
  const { setAccount } = useProfileStore();

  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<{ email: string, password: string }>();

  const navigate = useNavigate();

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
      const res = await usersApi.getMyProfileApiV1ProfilesMeGet();
      setAccount(res);
      navigate('/');
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
          <div className="mb-6">
            <label className="mb-2 block font-semibold" htmlFor="email">Email</label>
            <Input
              type="email"
              id="email"
              error={errors.email?.message}
              {...register('email', { required: 'Ce champ est obligatoire.' })}
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
    </div>
  );
}

export default AuthPage;
