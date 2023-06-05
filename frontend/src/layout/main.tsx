import { Outlet } from 'react-router-dom';
import Navbar from '../components/navbar';

export default function MainLayout() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4">
        <Outlet />
      </div>
    </>
  );
}
