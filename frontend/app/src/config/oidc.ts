// This configuration use the ServiceWorker mode only
// "access_token" will be provided automaticaly to the urls and
// domains configured inside "OidcTrustedDomains.js"

import { OidcConfiguration } from '@axa-fr/react-oidc';

export default {
  client_id: 'bbe2-frontend',
  redirect_uri: `${window.location.origin}/authentication/callback`,
  silent_redirect_uri: `${window.location.origin}/authentication/silent-callback`, // Optional activate silent-signin that use cookies between OIDC server and client javascript to restore the session
  scope: 'openid profile email offline_access',
  authority: import.meta.env.VITE_OIDC_PROVIDER_URL,
  storage: localStorage
} as OidcConfiguration;
