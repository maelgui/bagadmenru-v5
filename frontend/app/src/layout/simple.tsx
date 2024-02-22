import { useIsFetching } from '@tanstack/react-query';
import nprogress from 'nprogress';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Outlet } from 'react-router-dom';
import logo from '../assets/logov2full.svg';

export default function SimpleLayout() {
  const isFetching = useIsFetching();

  useEffect(() => {
    if (isFetching) {
      nprogress.inc();
    } else {
      nprogress.done();
    }
  }, [isFetching]);

  return (
    <>
      <Toaster position="bottom-center" />
      <div className={`${isFetching ? 'loading' : ''} p-4 min-h-screen flex `}>
        <div className="m-auto max-w-md w-full align-middle">
          <div className="flex justify-center">
            <img src={logo} alt="bagad men ru" className="h-64 m-4" />
          </div>
          <Outlet />
        </div>
      </div>
    </>
  );
}
