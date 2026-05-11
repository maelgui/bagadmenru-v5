import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../config/client';

export default function VersionInfo() {
  const { defaultApi } = useApiClient();

  const { data: versionData } = useQuery({
    queryKey: ['version'],
    queryFn: async () => await defaultApi.versionApiV1VersionGet(),
    staleTime: Infinity,
    retry: false,
  });

  return (
    <div className="mt-2 text-xs text-gray-400">
      <span>Frontend {import.meta.env.VITE_APP_VERSION}</span>
      <span className="mx-2">·</span>
      <span>Backend {versionData ? versionData.version : 'version inconnue'}</span>
    </div>
  );
}
