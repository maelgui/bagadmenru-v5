import { useIsFetching } from '@tanstack/react-query';
import nprogress from 'nprogress';
import { PropsWithChildren, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import LogoFullV2 from '../assets/logov2full';

interface SimpleLayoutProps extends PropsWithChildren {
  noQueryClient?: boolean
}

export default function SimpleLayout({ children, noQueryClient = false }: SimpleLayoutProps) {
  const isFetching = noQueryClient ? false : useIsFetching();

  useEffect(() => {
    if (isFetching) {
      nprogress.inc();
    } else {
      nprogress.done();
    }
  }, [isFetching]);

  return (
    <div className={`${isFetching ? 'loading' : ''} p-4 min-h-screen flex`}>
      <div className="m-auto max-w-md w-full align-middle">
        <div className="flex justify-center">
          <LogoFullV2 className="h-64 m-4" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function SimpleLayoutWithOutlet() {
  return <SimpleLayout><Outlet /></SimpleLayout>;
}
