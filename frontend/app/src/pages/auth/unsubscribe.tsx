import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/button';
import { useApiClient } from '../../config/client';

type UnsubscribePageParams = {
  token: string;
};

export default function UnsubscribePage() {
  const { usersApi } = useApiClient();
  const params = useParams<UnsubscribePageParams>();
  const [finished, setFinished] = useState<boolean>(false);

  const token = params.token!;
  const userId = JSON.parse(window.atob(token.split('.')[0])).user_id;

  const {
    handleSubmit, formState: { isSubmitting },
  } = useForm<{ email: string }>();

  const onSubmit = () => usersApi.unsubscribeApiV1ProfilesProfileIdUnsubscribePost({
    profileId: userId,
    token,
  }).then(() => setFinished(true));

  return (
    <div>
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
