import { Outlet } from 'react-router-dom';
import LoadingBar from '../components/loadingbar';
import Navbar from '../components/navbar';

export default function MainLayout() {
  return (
    <>
      <LoadingBar />
      <Navbar />
      <div className="container mx-auto p-4">
        <Outlet />
      </div>
    </>
  );
}
