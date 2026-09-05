import { useUserProfile } from '../../../config/client';
import AccountSection from '../components/settings/accountSection';

export default function SettingsAccountPage() {
  const profile = useUserProfile();
  if (!profile) {
    return null;
  }
  return <AccountSection profile={profile} />;
}
