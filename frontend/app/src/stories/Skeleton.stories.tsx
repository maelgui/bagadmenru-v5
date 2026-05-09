import type { Meta, StoryObj } from '@storybook/react-vite';
import { SkeletonText, SkeletonImage } from '../components/skeleton';

const metaText = {
  title: 'Components/Skeleton/Text',
  component: SkeletonText,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SkeletonText>;

export default metaText;
type Story = StoryObj<typeof metaText>;

export const Default: Story = {
  args: {
    className: 'w-48',
  },
};

export const Short: Story = {
  args: {
    className: 'w-24',
  },
};

export const Full: Story = {
  args: {
    className: 'w-full',
  },
};

// Additional stories for SkeletonImage as a separate export
export const ImageSmall: StoryObj<typeof SkeletonImage> = {
  render: (args) => <SkeletonImage {...args} />,
  args: {
    className: 'h-12 w-12',
  },
};

export const ImageMedium: StoryObj<typeof SkeletonImage> = {
  render: (args) => <SkeletonImage {...args} />,
  args: {
    className: 'h-24 w-24',
  },
};

export const ImageLarge: StoryObj<typeof SkeletonImage> = {
  render: (args) => <SkeletonImage {...args} />,
  args: {
    className: 'h-48 w-48',
  },
};

export const ProfileCardLoading: StoryObj = {
  render: () => (
    <div className="flex items-center gap-4 p-4 border rounded">
      <SkeletonImage className="h-12 w-12" />
      <div className="flex flex-col gap-2">
        <SkeletonText className="w-32" />
        <SkeletonText className="w-48" />
      </div>
    </div>
  ),
};
