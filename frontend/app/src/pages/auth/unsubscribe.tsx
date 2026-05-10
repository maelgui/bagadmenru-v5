import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import Button from '../../components/button';
import { useApiClient } from '../../config/client';

const tokenPayloadSchema = z.object({
  user_id: z.string(),
});

function extractUserIdFromToken(token: string): string {
  const {0: data} = token.split('.');
  const payload = tokenPayloadSchema.parse(JSON.parse(window.atob(data)));
  return payload.user_id;
}

export default function UnsubscribePage() {
  const { usersApi } = useApiClient();
  const { token } = useParams<"token">();
  const [finished, setFinished] = useState<boolean>(false);

  if (!token) {
    throw new Error('No token provided');
  }

  const userId: string = extractUserIdFromToken(token);

  const {
    handleSubmit, formState: { isSubmitting },
  } = useForm<{ email: string }>();

  const onSubmit = async () => await usersApi.unsubscribeApiV1ProfilesProfileIdUnsubscribePost({
    profileId: userId,
    token,
  }).then(() => setFinished(true));

  return (
    <div>
      <h1 className="text-2xl mb-2">Se désinscrire</h1>
      <p className="text-gray-500 mb-8">Gérez vos préférences de notification</p>
      {finished ? (
        <>
          <div className="mb-6">
            C&apos;est noté, vous ne receverez plus d&apos;email de notre part !
          </div>
          <Button as={Link} to="/" type="button" variant="ghost">Retour</Button>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* reset email form */}
          <div className="mb-6">
            Êtes vous sûr de ne plus vouloir recevoir aucun email ?
          </div>
          <div className="flex justify-between">
            <Button as={Link} to="/" type="button" variant="ghost">Retour</Button>
            <Button type="submit" isLoading={isSubmitting}>Oui me déinscrire</Button>
          </div>
        </form>
      )}
    </div>
  );
}
