import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Spinner } from '@/components/ui/spinner';
import { AuthStatus, useAuth } from '../config/client';

export default function AuthGuard() {
  const { status } = useAuth();
  const location = useLocation();

  switch (status) {
    case AuthStatus.Authenticated:
      return <Outlet />;
    case AuthStatus.Guest:
      // Remember where the user wanted to go so the login page can send them back.
      return <Navigate to="/auth/login" state={{ from: `${location.pathname}${location.search}` }} replace />;
    default:
      return (
        <div className="flex items-center justify-center gap-2 p-4 text-muted-foreground" role="status">
          <Spinner aria-hidden="true" />
          Chargement...
        </div>
      );
  }
}
