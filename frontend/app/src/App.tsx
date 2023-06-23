import { OidcProvider } from '@axa-fr/react-oidc';
import { QueryClientProvider } from '@tanstack/react-query';
import { Configuration, DefaultConfig } from 'bagad-client';
import { RouterProvider } from 'react-router-dom';
import './App.css';
import { queryClient } from './config/client';
import oidcConfiguration from './config/oidc';
import router from './config/router';

DefaultConfig.config = new Configuration({ basePath: import.meta.env.VITE_BBE2_API_URL });

function App() {
  return (
    <OidcProvider configuration={oidcConfiguration}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </OidcProvider>
  );
}

export default App;
