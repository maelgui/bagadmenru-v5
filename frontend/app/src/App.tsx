import { QueryClientProvider } from '@tanstack/react-query';
import { Configuration, DefaultConfig } from 'bagad-client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/toast';
import './App.css';
import { queryClient } from './config/client';
import router from './config/router';
import { ThemeProvider } from './config/theme';
import env from './env';

DefaultConfig.config = new Configuration({ basePath: env.VITE_BBE2_API_URL });

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster>
          <RouterProvider router={router} />
        </Toaster>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
