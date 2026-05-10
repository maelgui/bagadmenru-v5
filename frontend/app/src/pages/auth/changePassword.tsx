
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import type { ResetPassword } from 'bagad-client';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/button';
import Input from '../../components/input';
import { useApiClient } from '../../config/client';


function ChangePasswordPage() {
  const { authApi } = useApiClient();

  const { token } = useParams<"token">();

  const {
    register, handleSubmit, formState: { errors, isSubmitSuccessful },
  } = useForm<ResetPassword>();

  if (token === undefined) {
    return null
  }

  const onSubmit = async (data: ResetPassword) => {
    await authApi.resetPasswordApiV1AuthResetPost({ resetPassword: data, token });
  };

  return (
    <div>
      <h1 className="text-2xl mb-2">Changer le mot de passe</h1>
      <p className="text-gray-500 mb-8">Choisissez un nouveau mot de passe</p>
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
            <Button type="submit" icon={faWandMagicSparkles}>
              Changer
            </Button>
          </div>

        </form>
      )}
    </div>
  );
}

export default ChangePasswordPage;
