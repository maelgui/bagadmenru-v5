import { useAuth } from 'react-oidc-context';

export default function Empty() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }
  if (auth.error) {
    return (
      <div>
        Error:
        {auth.error.message}
        <button type="button" onClick={() => auth.signinRedirect()}>Retry</button>
      </div>
    );
  }
  return (<div />);
}
