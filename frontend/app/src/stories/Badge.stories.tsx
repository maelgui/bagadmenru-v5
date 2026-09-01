import { CheckIcon } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@/components/ui/badge';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
      control: { type: 'select' },
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Membre',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Sonneur',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Inactif',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Invité',
  },
};

export const WithIcon: Story = {
  render: () => (
    <Badge variant="secondary">
      <CheckIcon data-icon="inline-start" />
      Présent
    </Badge>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Défaut</Badge>
      <Badge variant="secondary">Secondaire</Badge>
      <Badge variant="destructive">Destructif</Badge>
      <Badge variant="outline">Contour</Badge>
      <Badge variant="ghost">Ghost</Badge>
      <Badge variant="link">Lien</Badge>
    </div>
  ),
};
