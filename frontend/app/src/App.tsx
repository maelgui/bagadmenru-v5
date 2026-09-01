import { QueryClientProvider } from '@tanstack/react-query';
import { Configuration, DefaultConfig } from 'bagad-client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import './App.css';
import { queryClient } from './config/client';
import router from './config/router';
import env from './env';

DefaultConfig.config = new Configuration({ basePath: env.VITE_BBE2_API_URL });

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster>
          <RouterProvider router={router} />
        </Toaster>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
