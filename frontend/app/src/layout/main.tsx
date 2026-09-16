import { Outlet } from 'react-router-dom';

import Footer from '../components/footer';
import Navbar from '../components/navbar';
import { useRouteProgress } from '../utils/useRouteProgress';

export default function MainLayout() {
  useRouteProgress();

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <a
        href="#main-content"
        className="fixed top-4 left-4 z-[60] -translate-y-24 rounded-2xl bg-card px-4 py-2 font-semibold shadow-lg transition-transform focus:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        Aller au contenu principal
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
