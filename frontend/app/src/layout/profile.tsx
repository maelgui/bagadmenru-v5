import { useQuery } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';
import { usersApi } from '../config/client';

export default function ProfileGuard() {
  const { isSuccess, error, data } = useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: () => usersApi.getMyProfileApiV1ProfilesMeGet(),
  });

  console.log(error, data);

  if (!isSuccess) {
    return null;
  }

  return <Outlet />;
}
