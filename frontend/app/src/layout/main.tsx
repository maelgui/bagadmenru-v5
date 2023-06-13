import nprogress from 'nprogress';
import { useEffect } from 'react';
import { useIsFetching } from 'react-query';
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
      <Navbar />
      <div className={`container mx-auto p-4 ${isFetching ? 'loading' : ''}`}>
        <Outlet />
      </div>
    </>
  );
}
