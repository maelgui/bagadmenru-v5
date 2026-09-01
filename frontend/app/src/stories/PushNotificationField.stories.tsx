import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import PushNotificationField from '../components/PushNotificationField';
import { Toaster } from '@/components/ui/toast';

const meta = {
  title: 'Components/PushNotificationField',
  component: PushNotificationField,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      options: ['unsupported', 'denied', 'granted', 'default'],
      control: { type: 'select' },
    },
  },
  args: {
    checked: false,
    onCheckedChange: () => {},
    isLoading: false,
    status: 'default',
    isSupported: true,
    staged: false,
    showTest: false,
  },
  decorators: [
    (Story) => (
      <Toaster>
        <Story />
      </Toaster>
    ),
  ],
  render: (args) => {
    // `checked` is controlled by the parent; wire it to Storybook args so the
    // switch toggles live in the canvas.
    const [{ checked }, updateArgs] = useArgs();
    return (
      <PushNotificationField
        {...args}
        checked={checked}
        onCheckedChange={(next) => updateArgs({ checked: next })}
      />
    );
  },
} satisfies Meta<typeof PushNotificationField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Enabled: Story = {
  args: {
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
  },
};

export const Loading: Story = {
  args: {
    checked: true,
    isLoading: true,
  },
};

export const Staged: Story = {
  args: {
    checked: true,
    staged: true,
  },
};

export const WithTestButton: Story = {
  args: {
    checked: true,
    showTest: true,
  },
};

export const Denied: Story = {
  args: {
    status: 'denied',
  },
};

export const Unsupported: Story = {
  args: {
    isSupported: false,
  },
};
