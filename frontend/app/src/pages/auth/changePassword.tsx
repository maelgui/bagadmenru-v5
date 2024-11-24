/* eslint-disable react/jsx-props-no-spreading */
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import Button from '../../components/button';
import Input from '../../components/input';
import { useApiClient } from '../../config/client';

function ChangePasswordPage() {
  const { authApi } = useApiClient();
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<{ email: string, password: string, passwordConfirm: string }>();

  const onSubmit = (data: { email: string }) => {
    authApi.resetPasswordApiV1AuthResetPost({ resetPasswordRequest: { email: data.email } });
  };

  return (
    <div>
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
    </div>
  );
}

export default ChangePasswordPage;
