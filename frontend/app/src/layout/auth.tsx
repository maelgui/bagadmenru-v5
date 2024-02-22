import { OidcSecure } from '@axa-fr/react-oidc';
import { useQuery } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';
import { useApiClient } from '../config/client';
import LoadingComponent from '../pages/error/loading';

export default function AuthGuard() {
  const { usersApi } = useApiClient();
  const { data: profile } = useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: () => usersApi.getMyProfileApiV1ProfilesMeGet(),
  });

  return (
    <OidcSecure>
      {profile ? <Outlet /> : <LoadingComponent />}
    </OidcSecure>
  );
}
