import { Outlet } from 'react-router-dom';
import UserInfo from '../components/UserInfo';
import Navbar from '../components/navbar';

export default function MainLayout() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto">
        <UserInfo />
        <h1>Vite + React</h1>
        <div className="card">
          <Outlet />
        </div>
      </div>
    </>
  );
}
