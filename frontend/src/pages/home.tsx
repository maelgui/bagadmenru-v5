import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate('/profile')}>
      My Profile
    </button>
  );
}
