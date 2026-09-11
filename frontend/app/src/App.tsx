import { QueryClientProvider } from '@tanstack/react-query';
import { Configuration, DefaultConfig } from 'bagad-client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/toast';
import './App.css';
import DebugBar from './components/debug-bar';
import { queryClient } from './config/client';
import router from './config/router';
import { ThemeProvider } from './config/theme';
import { useAppBadge } from './utils/useAppBadge';
import env from './env';

DefaultConfig.config = new Configuration({ basePath: env.VITE_BBE2_API_URL });

/**
 * Renderless component that keeps the PWA icon badge in sync with the number
 * of unanswered doodle events. Mounted inside the query provider so it can use
 * the shared react-query cache.
 */
function AppBadge() {
  useAppBadge();
  return null;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppBadge />
        <Toaster>
          <RouterProvider router={router} />
        </Toaster>
        <DebugBar />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
