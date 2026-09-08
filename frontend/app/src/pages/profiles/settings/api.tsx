import ApiKeysSection from '../components/settings/apiKeysSection';

/**
 * "Accès API" settings section: manage per-member API keys.
 */
export default function SettingsApiPage() {
  return (
    <div className="flex flex-col gap-6">
      <ApiKeysSection />
    </div>
  );
}
