import { Bold, Italic } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toggle } from '@/components/ui/toggle';

const meta = {
  title: 'Components/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      options: ['default', 'outline'],
      control: { type: 'radio' },
    },
    size: {
      options: ['sm', 'default', 'lg'],
      control: { type: 'radio' },
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Gras',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Contour',
  },
};

export const Pressed: Story = {
  args: {
    defaultPressed: true,
    children: 'Actif',
  },
};

export const WithIcon: Story = {
  render: () => (
    <Toggle aria-label="Mettre en gras">
      <Bold />
    </Toggle>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <Italic data-icon="inline-start" />
        Italique
      </>
    ),
  },
};
