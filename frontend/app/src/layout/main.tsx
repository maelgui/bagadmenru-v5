import { useIsFetching } from '@tanstack/react-query';
import nprogress from 'nprogress';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Footer from '../components/footer';
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
      <div className={`${isFetching ? '' : ''}`}>
        <Outlet />
      </div>
      <div className="mt-auto">
        <Footer />
      </div>
    </>
  );
}
