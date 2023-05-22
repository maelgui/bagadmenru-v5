import { OidcSecure } from '@axa-fr/react-oidc';
import { Outlet } from 'react-router-dom';

export default function AuthGuard() {
  return (
    <Outlet />
  );
}
