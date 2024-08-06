import { OidcConfiguration } from '@axa-fr/react-oidc';

export default {
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  redirect_uri: `${window.location.origin}/authentication/callback`,
  silent_redirect_uri: `${window.location.origin}/authentication/silent-callback`, // Optional activate silent-signin that use cookies between OIDC server and client javascript to restore the session
  scope: 'openid profile email offline_access',
  authority: import.meta.env.VITE_OIDC_PROVIDER_URL,
  storage: localStorage,
  token_request_extras: { audience: 'https://api.beta.bagadmenru.bzh' },
} as OidcConfiguration;
