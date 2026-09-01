import { WandSparkles } from 'lucide-react';
import type { ResetPassword } from 'bagad-client';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import PasswordField from '../../components/PasswordField';
import { useApiClient } from '../../config/client';
import { cn } from '@/lib/utils';

function ChangePasswordPage() {
  const { authApi } = useApiClient();
  const { token } = useParams<'token'>();
  const {
    register, handleSubmit, formState: { errors, isSubmitSuccessful },
  } = useForm<ResetPassword>();

  if (token === undefined) {
    return null;
  }

  const onSubmit = async (data: ResetPassword) => {
    await authApi.resetPasswordApiV1AuthResetPost({ resetPassword: data, token });
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl">Changer le mot de passe</h1>
      <p className="mb-8 text-muted-foreground">Choisissez un nouveau mot de passe</p>
      {isSubmitSuccessful ? (
        <>
          <div className="mb-6">Mot de passe changé avec succès !</div>
          <Link to="/" className={cn(buttonVariants({ variant: 'ghost' }))}>Retour</Link>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <input type="hidden" id="email" {...register('email')} />
          <FieldGroup>
            <PasswordField
              id="password"
              label="Mot de passe"
              error={errors.password?.message}
              autoComplete="new-password"
              registration={register('password', { required: 'Ce champ est obligatoire.' })}
            />
            <PasswordField
              id="passwordConfirm"
              label="Confirmation"
              error={errors.passwordConfirm?.message}
              autoComplete="new-password"
              registration={register('passwordConfirm', { required: 'Ce champ est obligatoire.' })}
            />
            <div className="flex justify-between">
              <Link to="/auth/login" className={cn(buttonVariants({ variant: 'ghost' }))}>Retour</Link>
              <Button type="submit"><WandSparkles data-icon="inline-start" />Changer</Button>
            </div>
          </FieldGroup>
        </form>
      )}
    </div>
  );
}

export default ChangePasswordPage;
