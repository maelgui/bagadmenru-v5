import { OidcProvider, OidcSecure } from '@axa-fr/react-oidc';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from './App';
import {
  EventsService, FilesService,
  OpenAPI,
} from './client';
import './index.css';
import Debug from './pages/debug';
import HomePage from './pages/home';
import MyProfile from './pages/profile';

// This configuration use the ServiceWorker mode only
// "access_token" will be provided automaticaly to the urls and
// domains configured inside "OidcTrustedDomains.js"
const configuration = {
  client_id: 'bbe2-frontend',
  redirect_uri: `${window.location.origin}/authentication/callback`,
  silent_redirect_uri: `${window.location.origin}/authentication/silent-callback`, // Optional activate silent-signin that use cookies between OIDC server and client javascript to restore the session
  scope: 'openid profile email offline_access',
  authority: import.meta.env.VITE_OIDC_PROVIDER_URL,
  service_worker_relative_url: '/OidcServiceWorker.js',
  service_worker_only: true,
};

OpenAPI.BASE = import.meta.env.VITE_BBE2_API_URL;

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
        element: <OidcSecure><Outlet /></OidcSecure>,
        children: [
          {
            path: '/profile',
            element: <MyProfile />,
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
