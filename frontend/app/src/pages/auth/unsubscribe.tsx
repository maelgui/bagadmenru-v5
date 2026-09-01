import { OctagonX } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useApiClient } from '../../config/client';
import { cn } from '@/lib/utils';

const tokenPayloadSchema = z.object({
  user_id: z.string(),
});

const BASE64_BLOCK_SIZE = 4;

/**
 * Decodes a base64url string (as produced by itsdangerous'
 * URLSafeTimedSerializer): '-'/'_' alphabet, no padding.
 * `window.atob` alone rejects this alphabet.
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (BASE64_BLOCK_SIZE - (base64.length % BASE64_BLOCK_SIZE)) % BASE64_BLOCK_SIZE;
  return window.atob(base64.padEnd(base64.length + padding, '='));
}

/**
 * Extracts the user id from the unsubscribe token payload (first dot-separated
 * segment). Returns undefined for malformed tokens: the signature itself is
 * only verified server-side.
 */
function extractUserIdFromToken(token: string): string | undefined {
  try {
    const { 0: data } = token.split('.');
    const payload = tokenPayloadSchema.parse(JSON.parse(decodeBase64Url(data)));
    return payload.user_id;
  } catch {
    return undefined;
  }
}

function InvalidTokenAlert() {
  return (
    <div>
      <Alert variant="destructive" className="mb-6">
        <OctagonX />
        <AlertTitle>Lien invalide</AlertTitle>
        <AlertDescription>
          Ce lien de désinscription est invalide ou incomplet. Veuillez utiliser le lien présent dans votre email, ou contacter un administrateur.
        </AlertDescription>
      </Alert>
      <Link to="/" className={cn(buttonVariants({ variant: 'ghost' }))}>Retour</Link>
    </div>
  );
}

export default function UnsubscribePage() {
  const { usersApi } = useApiClient();
  const { token } = useParams<'token'>();
  const [finished, setFinished] = useState<boolean>(false);
  const { handleSubmit, formState: { isSubmitting } } = useForm();

  const userId = token ? extractUserIdFromToken(token) : undefined;
  if (!token || !userId) {
    return <InvalidTokenAlert />;
  }

  const onSubmit = async () => await usersApi.unsubscribeApiV1ProfilesProfileIdUnsubscribePost({
    profileId: userId,
    token,
  }).then(() => setFinished(true));

  return (
    <div>
      <h1 className="mb-2 text-2xl">Se désinscrire</h1>
      <p className="mb-8 text-muted-foreground">Gérez vos préférences de notification</p>
      {finished ? (
        <>
          <div className="mb-6">C&apos;est noté, vous ne recevrez plus d&apos;email de notre part !</div>
          <Link to="/" className={cn(buttonVariants({ variant: 'ghost' }))}>Retour</Link>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <p className="mb-6">Êtes-vous sûr de ne plus vouloir recevoir aucun email ?</p>
          <div className="flex justify-between">
            <Link to="/" className={cn(buttonVariants({ variant: 'ghost' }))}>Retour</Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              Oui, me désinscrire
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
