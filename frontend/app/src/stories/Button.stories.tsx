import { WandSparkles } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
      control: { type: 'select' },
    },
    size: {
      options: ['xs', 'sm', 'default', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
      control: { type: 'select' },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Button',
    variant: 'default',
  },
};

export const Outline: Story = {
  args: {
    children: 'Button',
    variant: 'outline',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Button',
    variant: 'ghost',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Button',
    variant: 'destructive',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Button',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Button',
  },
};

export const Loading: Story = {
  render: (args) => (
    <Button {...args} disabled>
      <Spinner data-icon="inline-start" />
      Chargement
    </Button>
  ),
};

export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      <WandSparkles data-icon="inline-start" />
      Button
    </Button>
  ),
};
