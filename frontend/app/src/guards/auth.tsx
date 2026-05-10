import { Navigate, Outlet } from 'react-router-dom';
import { AuthStatus, useAuth } from '../config/client';

export default function AuthGuard() {
  const { status } = useAuth();

  switch (status) {
    case AuthStatus.Authenticated:
      return <Outlet />;
    case AuthStatus.Guest:
      return <Navigate to="/auth/login" />;
    default:
      return <p>Chargement...</p>;
  }
}
