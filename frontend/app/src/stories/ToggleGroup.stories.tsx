import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const meta = {
  title: 'Components/ToggleGroup',
  component: ToggleGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => (
    <ToggleGroup defaultValue={['center']}>
      <ToggleGroupItem value="left" aria-label="Aligner à gauche">
        <AlignLeft />
      </ToggleGroupItem>
      <ToggleGroupItem value="center" aria-label="Centrer">
        <AlignCenter />
      </ToggleGroupItem>
      <ToggleGroupItem value="right" aria-label="Aligner à droite">
        <AlignRight />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Multiple: Story = {
  render: () => (
    <ToggleGroup variant="outline" defaultValue={['bold']}>
      <ToggleGroupItem value="bold" aria-label="Gras">
        <Bold />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italique">
        <Italic />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Souligné">
        <Underline />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Joined: Story = {
  render: () => (
    <ToggleGroup variant="outline" spacing={0} defaultValue={['center']}>
      <ToggleGroupItem value="left" aria-label="Aligner à gauche">
        <AlignLeft />
      </ToggleGroupItem>
      <ToggleGroupItem value="center" aria-label="Centrer">
        <AlignCenter />
      </ToggleGroupItem>
      <ToggleGroupItem value="right" aria-label="Aligner à droite">
        <AlignRight />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};
