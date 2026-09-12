import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import PasswordField from '../../../../components/PasswordField';

interface PasswordFormValues {
  password: string;
  passwordConfirm: string;
}

/**
 * "Mot de passe" section.
 *
 * UI only for now: the change-password backend endpoint is not implemented
 * yet. It will be added together with a step-up authentication check (the
 * current password is intentionally NOT requested here). Until then the
 * submit button stays disabled.
 *
 * TODO(backend): wire to POST /auth/change_password once available and
 * enable the submit button.
 */
export default function PasswordSection() {
  const {
    register,
    getValues,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    defaultValues: { password: '', passwordConfirm: '' },
  });

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <Card>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>
            Définissez un nouveau mot de passe pour vous connecter sans clé d&apos;accès.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <PasswordField
              id="new-password"
              label="Nouveau mot de passe"
              autoComplete="new-password"
              error={errors.password?.message}
              registration={register('password', {
                minLength: {
                  value: 8,
                  message: 'Le mot de passe doit contenir au moins 8 caractères.',
                },
              })}
            />
            <PasswordField
              id="confirm-password"
              label="Confirmer le mot de passe"
              autoComplete="new-password"
              error={errors.passwordConfirm?.message}
              registration={register('passwordConfirm', {
                validate: (value) => value === getValues('password') || 'Les mots de passe ne correspondent pas.',
              })}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 border-t">
          <Button type="submit" disabled>
            Enregistrer
          </Button>
          <p className="text-sm text-muted-foreground">
            La modification du mot de passe sera bientôt disponible.
          </p>
        </CardFooter>
      </Card>
    </form>
  );
}
