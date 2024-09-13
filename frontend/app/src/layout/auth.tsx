import { useQuery } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';
import { useApiClient } from '../config/client';
import LoadingComponent from '../pages/error/loading';

export default function AuthGuard() {
  const { usersApi } = useApiClient();
  const { status } = useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: () => usersApi.getMyProfileApiV1ProfilesMeGet(),
  });

  if (status === 'error') {
    throw new Response('Communication avec le backend impossible.', { status: 500 });
  }

  return (
    <div>
      {status === 'success' ? <Outlet /> : <LoadingComponent />}
    </div>
  );
}
