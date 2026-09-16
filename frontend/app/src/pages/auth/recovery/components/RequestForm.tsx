import type { ResetPasswordRequest } from 'bagad-client';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Field, FieldError, FieldGroup, FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useApiClient } from '../../../../config/client';

// Email form of the recovery request step. Owns its form state and API call;
// hands the minted grant id back to the page, which owns the URL transition.
function RequestForm({ onSent }: { onSent: (grantId: string) => void }) {
  const { authApi } = useApiClient();
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<ResetPasswordRequest>();

  const onSubmit = async (data: ResetPasswordRequest) => {
    const grant = await authApi.resetPasswordRequestApiV1AuthResetPasswordRequestPost({
      resetPasswordRequest: { email: data.email },
    });
    onSent(grant.grantId);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <p>Entrez votre email : nous vous enverrons de quoi vous reconnecter.</p>
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
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Spinner data-icon="inline-start" />}
          Envoyer
        </Button>
      </FieldGroup>
    </form>
  );
}

export default RequestForm;
