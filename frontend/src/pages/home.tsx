import { useOidcIdToken } from '@axa-fr/react-oidc';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header';

export default function HomePage() {
  const navigate = useNavigate();
  const { idTokenPayload } = useOidcIdToken();

  return (
    <>
      <Header title={`Hi ${idTokenPayload.name}`} />
      <button type="button" onClick={() => navigate('/profile')}>
        My Profile
      </button>
    </>
  );
}
