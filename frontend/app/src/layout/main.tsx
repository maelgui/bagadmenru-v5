import { useIsFetching } from '@tanstack/react-query';
import nprogress from 'nprogress';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/navbar';

export default function MainLayout() {
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
      <Navbar />
      <div className={`${isFetching ? 'loading' : ''}`}>
        <Outlet />
      </div>
    </>
  );
}
