/* eslint-disable react/jsx-props-no-spreading */
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import Button from '../../components/button';
import Input from '../../components/input';
import { useApiClient } from '../../config/client';

function LostPasswordPage() {
  const { authApi } = useApiClient();
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<{ email: string }>();

  const onSubmit = (data: { email: string }) => {
    console.log(data);
    authApi.resetPasswordApiV1AuthResetPost({ resetPasswordRequest: { email: data.email } });
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* reset email form */}
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
    </div>
  );
}

export default LostPasswordPage;
