import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Meta, StoryObj } from '@storybook/react-vite';
import VersionInfo from '../components/version-info';

// VersionInfo fetches the backend version via react-query. In Storybook the
// request won't resolve against a real API, so the component falls back to
// "version inconnue" - which is exactly the offline/loading state we want to
// document.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const meta = {
  title: 'Components/VersionInfo',
  component: VersionInfo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof VersionInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
