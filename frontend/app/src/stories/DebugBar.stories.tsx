import type { Meta, StoryObj } from '@storybook/react-vite';
import { useQueryClient } from '@tanstack/react-query';
import { type PropsWithChildren, useState } from 'react';
import { userEvent, within } from 'storybook/test';

import DebugBar from '../components/debug-bar';

// The bar only renders on non-production environments. The Storybook preview
// iframe is declared as 'beta' via .storybook/preview-head.html (window.env),
// which is what makes these stories visible in static builds too.

/**
 * Seed the react-query cache with what the panel fetches, so the stories show
 * populated sessions/versions instead of the offline fallbacks. The global
 * preview decorator already seeds the permissions. The background refetches
 * fail (no backend) and the seeded data simply sticks.
 */
function SeedApiCache({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  // useState initializer: runs exactly once per mount, before children render.
  useState(() => {
    queryClient.setQueryData(['version'], { version: '1.2.3-storybook' });
    queryClient.setQueryData(['auth', 'sessions'], [
      {
        id: 'abcdef1234567890', firstName: 'Jean', lastName: 'Test', active: true,
      },
      {
        id: '9876543210fedcba', firstName: 'Anna', lastName: 'Autre', active: false,
      },
    ]);
    // The active_account selector cookie the panel surfaces (plain cookie,
    // scoped to the preview iframe).
    document.cookie = 'active_account=abcdef1234567890; Path=/';
    return true;
  });
  return <>{children}</>;
}

const meta = {
  title: 'Components/DebugBar',
  component: DebugBar,
  parameters: {
    layout: 'fullscreen',
    // The bar is position:fixed - render docs previews in iframes so the
    // stories don't stack on top of each other in the docs page.
    docs: { story: { inline: false, iframeHeight: 420 } },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <SeedApiCache>
        <div className="min-h-96">
          <Story />
        </div>
      </SeedApiCache>
    ),
  ],
} satisfies Meta<typeof DebugBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Collapsed pill (default state) naming the environment. */
export const Fermee: Story = {
  name: 'Fermée (pastille)',
};

/** Expanded panel: versions, API URL, sessions, permissions, devtools toggle. */
export const Ouverte: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('debug-bar-toggle'));
    await canvas.findByTestId('debug-bar-panel');
  },
};
