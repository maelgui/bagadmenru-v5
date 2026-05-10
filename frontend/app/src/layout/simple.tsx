import { useIsFetching } from '@tanstack/react-query';
import nprogress from 'nprogress';
import { type PropsWithChildren, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import logo from '../assets/logov2fullsmallhorizontall.svg';

interface SimpleLayoutProps extends PropsWithChildren {
}

export default function SimpleLayout({ children }: SimpleLayoutProps) {
  const isFetching = useIsFetching();

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
        <div>
          <img src={logo} alt="logo du bagadmenru" className="h-16 my-16" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function SimpleLayoutWithOutlet() {
  return <SimpleLayout><Outlet /></SimpleLayout>;
}
