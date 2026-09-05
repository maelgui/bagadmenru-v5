import type { Profile } from 'bagad-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/**
 * "Compte" section. The email is shown read-only for now: editing it will be
 * added later with an email-confirmation flow (see backend TODO).
 */
export default function AccountSection({ profile }: { profile: Profile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compte</CardTitle>
        <CardDescription>
          Les informations d’identification de votre compte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel htmlFor="account-email">Adresse e-mail</FieldLabel>
          <Input
            id="account-email"
            type="email"
            value={profile.email}
            readOnly
            disabled
            autoComplete="email"
          />
          <FieldDescription>
            La modification de l’adresse e-mail sera bientôt disponible.
          </FieldDescription>
        </Field>
      </CardContent>
    </Card>
  );
}
