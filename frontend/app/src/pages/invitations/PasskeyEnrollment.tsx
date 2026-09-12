import { KeyRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
 *
 * When `onSkip` is provided a "Plus tard" escape hatch is shown: enrolment can
 * fail for reasons outside the user's control (old browser, cancelled prompt,
 * unsupported device) and the user is already signed in at this point, so the
 * flow must never dead-end on this screen.
 */
export default function PasskeyEnrollment({
  onEnrolled,
  onSkip,
  title = 'Sécurisez votre compte',
  description = 'Créez une passkey pour vous connecter sans mot de passe, avec votre empreinte, votre visage ou le code de votre appareil.',
}: {
  onEnrolled: () => void;
  onSkip?: () => void;
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

      {register.isError ? (
        <Alert variant="destructive" className="mb-6 text-left">
          <AlertTitle>La création de la passkey a échoué</AlertTitle>
          <AlertDescription>
            Votre appareil a peut-être annulé ou refusé l&apos;opération. Vous
            pouvez réessayer
            {onSkip ? ' ou continuer sans passkey' : ''}
            .
          </AlertDescription>
        </Alert>
      ) : null}

      <Button className="w-full" onClick={onCreate} disabled={register.isPending}>
        {register.isPending ? <Spinner data-icon="inline-start" /> : <KeyRound data-icon="inline-start" aria-hidden="true" />}
        {register.isError ? 'Réessayer' : 'Créer une passkey'}
      </Button>

      {onSkip ? (
        <>
          <Button
            type="button"
            variant="ghost"
            className="mt-2 w-full text-muted-foreground"
            onClick={onSkip}
            disabled={register.isPending}
          >
            Plus tard
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Vous pourrez créer une passkey à tout moment depuis vos réglages.
          </p>
        </>
      ) : null}
    </div>
  );
}
