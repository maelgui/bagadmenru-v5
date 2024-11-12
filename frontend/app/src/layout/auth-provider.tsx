import { User } from 'oidc-client-ts';
import { AuthProvider, AuthProviderProps } from 'react-oidc-context';
import { Outlet, useNavigate } from 'react-router-dom';
import env from '../env';

const oidcConfig: AuthProviderProps = {
  authority: env.VITE_OIDC_PROVIDER_URL,
  client_id: env.VITE_OIDC_CLIENT_ID,
  redirect_uri: `${window.location.origin}/callback`,
  scope: 'profile email openid offline aaa',
  resource: env.VITE_BBE2_API_URL,
};

export default function MyAuthProvider() {
  const navigate = useNavigate();

  const onSigninCallback = (_user: User | undefined) => {
    navigate(_user?.url_state || window.location.pathname);
  };

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <AuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
      <Outlet />
    </AuthProvider>
  );
}
