import { useIsFetching } from '@tanstack/react-query';
import nprogress from 'nprogress';
import { type PropsWithChildren, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import logo from '../assets/logov2fullsmallhorizontall.svg';
import VersionInfo from '../components/version-info';

export default function SimpleLayout({ children }: PropsWithChildren) {
  const isFetching = useIsFetching();

  useEffect(() => {
    if (isFetching) {
      nprogress.inc();
    } else {
      nprogress.done();
    }
  }, [isFetching]);

  return (
    <div className={`${isFetching ? 'loading' : ''} flex min-h-screen flex-col p-4`}>
      <main className="m-auto w-full max-w-md">
        <img src={logo} alt="Logo du Bagad Men Ru" className="my-16 h-16" />
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
