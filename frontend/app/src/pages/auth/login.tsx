/* eslint-disable react/jsx-props-no-spreading */
import { LoginData, ResponseError } from 'bagad-client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Alert from '../../components/alert';
import Button from '../../components/button';
import Input from '../../components/input';
import { queryClient, useApiClient } from '../../config/client';

function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const { auth } = useApiClient();
  const navigate = useNavigate();
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<LoginData>();

  const onSubmit = (data: LoginData) => {
    auth.loginApiV1AuthLoginPost({ loginData: data })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] }).then(() => {
          navigate('/');
          toast.success('Connexion réussie !');
        });
      })
      .catch((e) => {
        if (e instanceof ResponseError && e.response.status === 401) {
          setErrorMessage('Bad email/password');
        } else {
          toast.error(`Erreur lors de la connexion : ${e.message}`);
        }
      });
  };

  return (
    <>
      <h1 className="text-2xl mb-6">
        Connexion
      </h1>
      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-6">
          <label className="mb-2 block font-semibold" htmlFor="identifier">Adresse e-mail</label>
          <Input
            type="email"
            id="identifier"
            error={errors.identifier?.message}
            {...register('identifier', { required: 'Ce champ est obligatoire.' })}
          />
        </div>
        <div className="mb-6">
          <label className="mb-2 block font-semibold" htmlFor="description">Mot de passe</label>
          <Input
            type="password"
            id="password"
            error={errors.password?.message}
            {...register('password', { required: 'Ce champ est obligatoire.' })}
          />
        </div>
        <Button type="submit">Connexion</Button>
      </form>
    </>
  );
}

export default LoginPage;
