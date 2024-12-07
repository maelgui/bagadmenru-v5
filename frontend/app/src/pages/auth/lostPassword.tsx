/* eslint-disable react/jsx-props-no-spreading */
import { ResetPasswordRequest } from 'bagad-client';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import Button from '../../components/button';
import Input from '../../components/input';
import { useApiClient } from '../../config/client';

function LostPasswordPage() {
  const { authApi } = useApiClient();
  const {
    register, handleSubmit, formState: { errors, isSubmitSuccessful },
  } = useForm<ResetPasswordRequest>();

  // eslint-disable-next-line max-len
  const onSubmit = (data: ResetPasswordRequest) => authApi.resetPasswordRequestApiV1AuthResetPasswordRequestPost({
    resetPasswordRequest: { email: data.email },
  });

  return (
    <div>
      {isSubmitSuccessful ? (
        <>
          <div className="mb-6">
            Un email vous a été envoyé pour réinitialiser votre mot de passe.
          </div>
          <Button as={Link} to="/auth/login" type="button" variant="ghost">Retour</Button>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-6">
            Entrez votre email pour recevoir un lien de réinitialisation de mot de passe.
          </div>
          <div className="mb-6">
            <label className="mb-2 block font-semibold" htmlFor="email">Email</label>
            <Input
              type="email"
              id="email"
              error={errors.email?.message}
              {...register('email', { required: 'Ce champ est obligatoire.' })}
            />
          </div>
          <div className="flex justify-between">
            <Button as={Link} to="/auth/login" type="button" variant="ghost">Retour</Button>
            <Button type="submit">Envoyer</Button>
          </div>

        </form>
      )}
    </div>
  );
}

export default LostPasswordPage;
