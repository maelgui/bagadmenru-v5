import { useUserProfile } from '../../../config/client';
import ProfileSection from '../components/settings/profileSection';

export default function SettingsProfilePage() {
  const profile = useUserProfile();
  if (!profile) {
    return null;
  }
  return <ProfileSection profile={profile} />;
}
