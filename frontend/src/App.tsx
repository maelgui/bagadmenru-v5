import { OidcProvider } from '@axa-fr/react-oidc';
import { RouterProvider } from 'react-router-dom';
import './App.css';
import oidcConfiguration from './config/oidc';
import router from './config/router';

function App() {
  return (
    <OidcProvider configuration={oidcConfiguration}>
      <RouterProvider router={router} />
    </OidcProvider>
  );
}

export default App;
