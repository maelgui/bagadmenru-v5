import type { Preview } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import "../src/index.css";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [
    (Story) => {
      // Fresh client per story render; disable retries so failed
      // (unmocked) queries settle immediately instead of retrying.
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      // Seed the cache so hooks backed by React Query
      // (useUserProfile, usePermissions, useAuth) render real content
      // without a backend.
      queryClient.setQueryData(["profiles", "me"], {
        id: "1",
        firstName: "Jean",
        lastName: "Test",
        pictureUrl: null,
      });
      queryClient.setQueryData(
        ["profiles", "me", "permissions"],
        ["view:event", "create:response", "view:file", "view:profile"],
      );

      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Story />
          </MemoryRouter>
        </QueryClientProvider>
      );
    },
  ],
};

export default preview;
