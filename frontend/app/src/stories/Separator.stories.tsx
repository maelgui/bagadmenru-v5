import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from '@/components/ui/separator';

const meta = {
  title: 'Components/Separator',
  component: Separator,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-72">
      <p className="text-sm font-medium">Bagad Men Ru</p>
      <p className="text-sm text-muted-foreground">Ensemble de musique bretonne</p>
      <Separator className="my-4" />
      <div className="flex h-5 items-center gap-4 text-sm">
        <span>Membres</span>
        <Separator orientation="vertical" />
        <span>Événements</span>
        <Separator orientation="vertical" />
        <span>Photos</span>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-16 items-center gap-4 text-sm">
      <span>Cornemuse</span>
      <Separator orientation="vertical" />
      <span>Bombarde</span>
      <Separator orientation="vertical" />
      <span>Caisse claire</span>
    </div>
  ),
};
