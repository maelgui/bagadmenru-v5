import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'Components/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger nativeButton render={<Button variant="outline" />}>
        Survolez-moi
      </PopoverTrigger>
      <PopoverContent>Ajouter un nouveau membre</PopoverContent>
    </Popover>
  ),
};

export const Sides: Story = {
  render: () => (
    <div className="flex gap-4">
      <Popover>
        <PopoverTrigger nativeButton render={<Button variant="outline" />}>Haut</PopoverTrigger>
        <PopoverContent side="top">Info en haut</PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger nativeButton render={<Button variant="outline" />}>Bas</PopoverTrigger>
        <PopoverContent side="bottom">Info en bas</PopoverContent>
      </Popover>
    </div>
  ),
};
