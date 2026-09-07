import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useRegisterPasskey } from '../../utils/usePasskey';

/**
 * Reusable "create a passkey" screen.
 *
 * Presentational + the shared enrollment mutation, so it can be dropped into
 * any authenticated flow that wants to onboard a passkey: the post-signup step,
 * or the future password→passkey migration for existing members.
 *
 * Requires an authenticated session (the enrollment endpoints are gated).
 * Calls `onEnrolled` after a passkey is successfully created.
 */
export default function PasskeyEnrollment({
  onEnrolled,
  title = 'Sécurisez votre compte',
  description = 'Créez une passkey pour vous connecter sans mot de passe, avec votre empreinte, votre visage ou le code de votre appareil.',
}: {
  onEnrolled: () => void;
  title?: string;
  description?: string;
}) {
  const register = useRegisterPasskey();

  const onCreate = () => {
    register.mutate(undefined, { onSuccess: onEnrolled });
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <KeyRound aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-2xl">{title}</h1>
      <p className="mb-8 text-muted-foreground">{description}</p>

      <Button className="w-full" onClick={onCreate} disabled={register.isPending}>
        {register.isPending ? <Spinner data-icon="inline-start" /> : <KeyRound data-icon="inline-start" aria-hidden="true" />}
        Créer une passkey
      </Button>
    </div>
  );
}
