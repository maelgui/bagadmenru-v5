import { withAuthenticationRequired } from 'react-oidc-context';
import { Outlet } from 'react-router-dom';

export default withAuthenticationRequired(Outlet, {
  OnRedirecting: () => (<div>Redirecting to the login page...</div>),
  signinRedirectArgs: { url_state: window.location.pathname },
});
