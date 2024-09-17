/* eslint-disable react/jsx-props-no-spreading */
import { faEye, faEyeSlash } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation } from '@tanstack/react-query';
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

  const [type, setType] = useState('password');
  const [icon, setIcon] = useState(faEye);

  const handleToggle = () => {
    if (type === 'password') {
      setIcon(faEyeSlash);
      setType('text');
    } else {
      setIcon(faEye);
      setType('password');
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (data: LoginData) => auth.loginApiV1AuthLoginPost({ loginData: data }),
    onMutate: () => {
      setErrorMessage(undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] }).then(() => {
        navigate('/');
        toast.success('Connexion réussie !');
      });
    },
    onError: (error) => {
      if (error instanceof ResponseError && error.response.status === 401) {
        setErrorMessage('Email ou mot de passe inconnu.');
      } else {
        toast.error(`Erreur lors de la connexion : ${error.message}`);
      }
    },
  });
  const onSubmit = (data: LoginData) => mutate(data);

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
          <div className="relative">
            <Input
              type={type}
              id="password"
              error={errors.password?.message}
              {...register('password', { required: 'Ce champ est obligatoire.' })}
            />
            <button
              type="button"
              className="flex items-center absolute right-0 top-0 bottom-0"
              onClick={handleToggle}
              aria-label={type === 'password' ? 'Afficher le mot de passe' : 'Cacher le mot de passe'}
            >
              <FontAwesomeIcon className="mx-4 my-2" icon={icon} />
            </button>
          </div>
        </div>
        <Button type="submit" disabled={isPending} className={isPending ? 'animate-pulse' : ''}>Connexion</Button>
      </form>
    </>
  );
}

export default LoginPage;
