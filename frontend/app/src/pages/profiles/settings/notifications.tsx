import { useUserProfile } from '../../../config/client';
import NotificationsSection from '../components/settings/notificationsSection';

export default function SettingsNotificationsPage() {
  const profile = useUserProfile();
  if (!profile) {
    return null;
  }
  return <NotificationsSection profile={profile} />;
}
