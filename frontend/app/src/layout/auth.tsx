import { useQuery } from '@tanstack/react-query';
import { ResponseError } from 'bagad-client';
import { Navigate, Outlet } from 'react-router-dom';
import { useApiClient } from '../config/client';
import LoadingComponent from '../pages/error/loading';

export default function AuthGuard() {
  const { usersApi } = useApiClient();
  const { status, error, isFetching } = useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: () => usersApi.getMyProfileApiV1ProfilesMeGet(),
  });

  if (!isFetching && status === 'error') {
    if (error instanceof ResponseError && error.response.status === 401) {
      return <Navigate to="/auth/login" />;
    }
    throw new Response('Communication avec le backend impossible.', { status: 500 });
  }

  return (
    <div>
      {status === 'success' ? <Outlet /> : <LoadingComponent />}
    </div>
  );
}
