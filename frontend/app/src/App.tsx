import { OidcProvider } from '@axa-fr/react-oidc';
import { QueryClient, QueryClientProvider } from 'react-query';
import { RouterProvider } from 'react-router-dom';
import './App.css';
import oidcConfiguration from './config/oidc';
import router from './config/router';

const queryClient = new QueryClient();

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
