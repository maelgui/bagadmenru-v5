import { useOidc } from '@axa-fr/react-oidc';
// OpenAPI.BASE = "http://localhost:8000"

export default function UserInfo() {
  const { login, logout, isAuthenticated } = useOidc();

  return (
    <div className="container-fluid mt-3">

      <div className="card">

        <div className="card-body">
          <h5 className="card-title">Welcome!</h5>
          <p className="card-text">React Demo Application protected by OpenID Connect</p>
          {!isAuthenticated
            && <button type="button" className="btn btn-primary" onClick={() => login('/')}>Login</button>}
          {isAuthenticated
            && <button type="button" className="btn btn-primary" onClick={() => logout('/')}>logout</button>}
        </div>
      </div>
    </div>
  );
}
