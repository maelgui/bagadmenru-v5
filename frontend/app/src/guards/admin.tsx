import { Navigate, Outlet } from 'react-router-dom';

import { Spinner } from '@/components/ui/spinner';
import { usePermissions } from '../config/client';

/**
 * Only lets `view:admin` holders through. The backend enforces the permission
 * on every admin endpoint; this guard just avoids rendering screens that would
 * only show 403 toasts.
 */
export default function AdminGuard() {
  const { permissions, can } = usePermissions();

  if (!permissions) {
    return (
      <div className="flex items-center justify-center gap-2 p-4 text-muted-foreground" role="status">
        <Spinner aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (!can('view', 'admin')) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
