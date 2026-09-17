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
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      {/* Mirror the backend's runtime fallback (APP_VERSION defaults to
          "dev"): VITE_APP_VERSION is only injected by the node-build image
          stage, so it is undefined under the dev server (compose, Storybook,
          bare `yarn dev`). Same fallback as the debug bar. */}
      <span>Frontend {import.meta.env.VITE_APP_VERSION ?? 'dev'}</span>
      <span aria-hidden="true">·</span>
      <span>Backend {versionData ? versionData.version : 'version inconnue'}</span>
    </div>
  );
}
