import type { PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';

import logo from '../assets/logov2fullsmallhorizontall.svg';
import logoDark from '../assets/logov2fullsmallhorizontall-dark.svg';
import VersionInfo from '../components/version-info';
import { useTheme } from '../config/theme';
import { useRouteProgress } from '../utils/useRouteProgress';

export default function SimpleLayout({ children }: PropsWithChildren) {
  const busy = useRouteProgress();
  const { resolvedTheme } = useTheme();

  return (
    <div className={`${busy ? 'loading' : ''} flex min-h-screen flex-col p-4`}>
      <main className="m-auto w-full max-w-md">
        <img
          src={resolvedTheme === 'dark' ? logoDark : logo}
          alt="Logo du Bagad Men Ru"
          className="my-16 h-16"
        />
        {children}
      </main>
      <footer className="text-center">
        <VersionInfo />
      </footer>
    </div>
  );
}

export function SimpleLayoutWithOutlet() {
  return (
    <SimpleLayout>
      <Outlet />
    </SimpleLayout>
  );
}
