import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import img from './assets/lena.jpg';

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Image: Story = {
  render: () => (
    <Avatar className="size-12">
      <AvatarImage src={img} alt="profile" />
      <AvatarFallback>MG</AvatarFallback>
    </Avatar>
  ),
};

export const Small: Story = {
  render: () => (
    <Avatar className="size-24">
      <AvatarImage src={img} alt="profile" />
      <AvatarFallback>MG</AvatarFallback>
    </Avatar>
  ),
};

export const Large: Story = {
  render: () => (
    <Avatar className="size-64">
      <AvatarImage src={img} alt="profile" />
      <AvatarFallback>MG</AvatarFallback>
    </Avatar>
  ),
};

export const Placeholder: Story = {
  render: () => (
    <Avatar className="size-48">
      <AvatarFallback>MG</AvatarFallback>
    </Avatar>
  ),
};

export const PlaceholderSmall: Story = {
  render: () => (
    <Avatar className="size-10">
      <AvatarFallback>AB</AvatarFallback>
    </Avatar>
  ),
};
