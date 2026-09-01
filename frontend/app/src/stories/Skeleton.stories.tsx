import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from '@/components/ui/skeleton';

const meta = {
  title: 'Components/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {
  args: {
    className: 'h-2 w-48',
  },
};

export const ShortText: Story = {
  args: {
    className: 'h-2 w-24',
  },
};

export const Image: Story = {
  args: {
    className: 'size-24 rounded-full',
  },
};

export const ProfileCardLoading: StoryObj = {
  render: () => (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-2 w-32" />
        <Skeleton className="h-2 w-48" />
      </div>
    </div>
  ),
};
