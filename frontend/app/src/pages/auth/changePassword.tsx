/* eslint-disable react/jsx-props-no-spreading */
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ResetPassword } from 'bagad-client';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/button';
import Input from '../../components/input';
import { useApiClient } from '../../config/client';

type ChangePasswordPageParams = {
  token: string;
};

function ChangePasswordPage() {
  const { authApi } = useApiClient();

  const params = useParams<ChangePasswordPageParams>();

  const {
    register, handleSubmit, formState: { errors, isSubmitSuccessful },
  } = useForm<ResetPassword>();

  const onSubmit = (data: ResetPassword) => {
    authApi.resetPasswordApiV1AuthResetPost({ resetPassword: data, token: params.token! });
  };

  return (
    <div>
      {isSubmitSuccessful ? (
        <>
          <div className="mb-6">
            Mot de passe changé avec succès !
          </div>
          <Button as={Link} to="/" type="button" variant="ghost">Retour</Button>
        </>
      ) : (

        <form onSubmit={handleSubmit(onSubmit)}>
          <input
            type="hidden"
            id="email"
            {...register('email')}
          />

          <div className="mb-6">
            <label className="mb-2 block font-semibold" htmlFor="password">Mot de passe</label>
            <Input
              type="password"
              id="password"
              error={errors.password?.message}
              {...register('password', { required: 'Ce champ est obligatoire.' })}
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block font-semibold" htmlFor="passwordConfirm">Confirmation</label>
            <Input
              type="password"
              id="passwordConfirm"
              error={errors.passwordConfirm?.message}
              {...register('passwordConfirm', { required: 'Ce champ est obligatoire.' })}
            />
          </div>

          <div className="flex justify-between">
            <Button as={Link} to="/auth/login" type="button" variant="ghost">Retour</Button>
            <Button type="submit">
              <FontAwesomeIcon icon={faWandMagicSparkles} className="mr-2" />
              Changer
            </Button>
          </div>

        </form>
      )}
    </div>
  );
}

export default ChangePasswordPage;
