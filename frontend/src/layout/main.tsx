import { Outlet } from 'react-router-dom';
import Navbar from '../components/navbar';

export default function MainLayout() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto">
        <h1>Espace Membre</h1>
        <div className="card">
          <Outlet />
        </div>
      </div>
    </>
  );
}
