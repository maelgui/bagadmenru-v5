import { useMutation } from '@tanstack/react-query';
import type { SetPassword } from 'bagad-client';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import PasswordField from '../../../../components/PasswordField';
import { useApiClient } from '../../../../config/client';
import { extractErrorMessage } from '../../../../utils/errors';

/** Inline "choose a new password" form (authenticated: recovery signed us in). */
export default function SetPasswordForm({
  onBack,
  onDone,
}: {
  onBack: () => void;
  onDone: () => void;
}) {
  const { authApi } = useApiClient();
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<SetPassword>();

  // react-hook-form owns the field state/validation; the server call and its
  // pending/error state live in a mutation (house pattern).
  const setPassword = useMutation({
    mutationFn: async (data: SetPassword) => {
      try {
        await authApi.setPasswordApiV1AuthSetPasswordPost({ setPassword: data });
      } catch (error) {
        throw new Error(
          await extractErrorMessage(error, 'Une erreur est survenue. Veuillez réessayer.'),
        );
      }
    },
    onSuccess: onDone,
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl">Nouveau mot de passe</h1>
      <p className="mb-8 text-muted-foreground">
        Choisissez le mot de passe de vos prochaines connexions.
      </p>
      <form onSubmit={handleSubmit((data) => setPassword.mutate(data))}>
        <FieldGroup>
          {setPassword.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Impossible de changer le mot de passe</AlertTitle>
              <AlertDescription>{setPassword.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <PasswordField
            id="password"
            label="Mot de passe"
            error={errors.password?.message}
            autoComplete="new-password"
            registration={register('password', { required: 'Ce champ est obligatoire.' })}
          />
          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={onBack} disabled={setPassword.isPending}>
              Retour
            </Button>
            <Button type="submit" disabled={setPassword.isPending}>
              {setPassword.isPending && <Spinner data-icon="inline-start" />}
              Enregistrer
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
