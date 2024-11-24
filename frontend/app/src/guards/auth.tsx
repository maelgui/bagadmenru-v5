import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../config/client';
import { AuthStatus } from '../utils/authStore';

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
