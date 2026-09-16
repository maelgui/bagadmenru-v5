import { useNavigate } from 'react-router-dom';
import RequestForm from './components/RequestForm';
import ResetHeader from './components/ResetHeader';

/** Step route /auth/reset: ask for the email, then move to the grant step. */
export default function RequestStep() {
  const navigate = useNavigate();

  return (
    <div>
      <ResetHeader />
      <p className="mb-8 text-muted-foreground">Retrouvez l&apos;accès à votre compte</p>
      <RequestForm onSent={(grantId) => { void navigate(`/auth/reset/${grantId}`); }} />
    </div>
  );
}
