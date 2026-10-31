import { Outlet } from 'react-router-dom';
import AuditTracker from '../components/audit-tracker';

/** Root of every route: hosts the renderless, mounted-once observers. */
export default function RootLayout() {
  return (
    <>
      <AuditTracker />
      <Outlet />
    </>
  );
}
