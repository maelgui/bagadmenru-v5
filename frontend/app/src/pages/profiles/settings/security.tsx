import PasskeysSection from '../components/settings/passkeysSection';
import PasswordSection from '../components/settings/passwordSection';

export default function SettingsSecurityPage() {
  return (
    <div className="flex flex-col gap-6">
      <PasswordSection />
      <PasskeysSection />
    </div>
  );
}
