import type { Meta, StoryObj } from '@storybook/react-vite';
import Avatar from '../components/avatar';
import img from './assets/lena.jpg';
// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
  component: Avatar,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'padded',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
  },
  args: {
    children: 'Avatar',
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Default: Story = {
  args: {
  },
};

export const Image: Story = {
  args: {
    src: img,
  },
};

export const ExtraSmall: Story = {
  args: {
    src: img,
    size: 'xs',
  },
};

export const Small: Story = {
  args: {
    src: img,
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    src: img,
    size: 'lg',
  },
};

export const Placeholder: Story = {
  args: {
    placeholder: 'MG',
    size: 'md',
  },
};

export const PlaceholderSmall: Story = {
  args: {
    placeholder: 'AB',
    size: 'xxs',
  },
};
