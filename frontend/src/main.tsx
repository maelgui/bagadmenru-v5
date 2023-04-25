import { OidcProvider } from '@axa-fr/react-oidc';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from './App';
import { EventsService, FilesService, UsersService } from './client';
import './index.css';
import Debug from './pages/debug';
import HomePage from './pages/home';
import MyProfile from './pages/profile';
import Secure from './pages/secure';

// This configuration use the ServiceWorker mode only
// "access_token" will be provided automaticaly to the urls and
// domains configured inside "OidcTrustedDomains.js"
const configuration = {
  client_id: 'bbe2-frontend',
  redirect_uri: `${window.location.origin}/authentication/callback`,
  silent_redirect_uri: `${window.location.origin}/authentication/silent-callback`, // Optional activate silent-signin that use cookies between OIDC server and client javascript to restore the session
  scope: 'openid profile email offline_access',
  authority: 'http://localhost:8080/realms/bagadmenru',
  service_worker_relative_url: '/OidcServiceWorker.js',
  service_worker_only: true,
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        element: <Secure />,
        children: [
          {
            path: '/profile',
            element: <MyProfile />,
            loader: UsersService.getMyProfileApiV1ProfilesMeGet,
          },
          {
            path: '/files',
            element: <Debug />,
            loader: FilesService.getRootApiV1FilesGet,
          },
          {
            path: '/events',
            element: <Debug />,
            loader: EventsService.listEventsApiV1EventsGet,
          },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <OidcProvider configuration={configuration}>
      <RouterProvider router={router} />
    </OidcProvider>
  </React.StrictMode>,
);
