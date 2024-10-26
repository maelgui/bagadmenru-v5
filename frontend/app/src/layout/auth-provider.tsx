import { User } from 'oidc-client-ts';
import { AuthProvider, AuthProviderProps } from 'react-oidc-context';
import { Outlet, useNavigate } from 'react-router-dom';

const oidcConfig: AuthProviderProps = {
  authority: 'http://localhost:3000',
  client_id: 'bagad-frontend-dev',
  redirect_uri: 'http://localhost:5173/callback',
};

export default function MyAuthProvider() {
  const navigate = useNavigate();

  const onSigninCallback = (_user: User | undefined) => {
    console.log(_user, 'blabla');
    navigate(_user?.url_state || window.location.pathname);
  };

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <AuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
      <Outlet />
    </AuthProvider>
  );
}
