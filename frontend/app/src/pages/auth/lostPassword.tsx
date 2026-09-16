import type { ResetPasswordRequest } from 'bagad-client';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useApiClient } from '../../config/client';
import { cn } from '@/lib/utils';

function LostPasswordPage() {
  const { authApi } = useApiClient();
  const {
    register, handleSubmit, formState: { errors, isSubmitSuccessful },
  } = useForm<ResetPasswordRequest>();

  const onSubmit = async (data: ResetPasswordRequest) => await authApi.resetPasswordRequestApiV1AuthResetPasswordRequestPost({
    resetPasswordRequest: { email: data.email },
  });

  return (
    <div>
      <Link
        to="/auth/login"
        aria-label="Retour à la connexion"
        className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'mb-6 rounded-full')}
      >
        <ArrowLeft />
      </Link>
      <h1 className="mb-2 text-2xl">Mot de passe oublié</h1>
      <p className="mb-8 text-muted-foreground">Réinitialisez votre mot de passe</p>
      {isSubmitSuccessful ? (
        <div className="mb-6">Un email vous a été envoyé pour réinitialiser votre mot de passe.</div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <p>Entrez votre email pour recevoir un lien de réinitialisation de mot de passe.</p>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                type="email"
                id="email"
                aria-invalid={!!errors.email}
                {...register('email', { required: 'Ce champ est obligatoire.' })}
              />
              <FieldError>{errors.email?.message}</FieldError>
            </Field>
            <Button type="submit" className="w-full">Envoyer</Button>
          </FieldGroup>
        </form>
      )}
    </div>
  );
}

export default LostPasswordPage;
