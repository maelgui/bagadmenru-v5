import type { Meta, StoryObj } from '@storybook/react-vite';
import AvatarGroup from '../components/avatar-group';
import img from './assets/lena.jpg';

const meta = {
  title: 'Components/AvatarGroup',
  component: AvatarGroup,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AvatarGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleAvatars = [
  { id: '1', name: 'Marie Dupont', src: img },
  { id: '2', name: 'Jean Martin', src: img },
  { id: '3', name: 'Pierre Bernard', src: img },
  { id: '4', name: 'Sophie Durand', src: img },
  { id: '5', name: 'Luc Moreau', src: img },
  { id: '6', name: 'Claire Petit', src: img },
];

const DEFAULT_AVATAR_COUNT = 4;

export const Default: Story = {
  args: {
    avatars: sampleAvatars.slice(0, DEFAULT_AVATAR_COUNT),
  },
};

export const WithMaxTruncation: Story = {
  args: {
    avatars: sampleAvatars,
    max: 3,
  },
};

const WITH_EXTRA_COUNT_AVATAR_COUNT = 3;

export const WithExtraCount: Story = {
  args: {
    avatars: sampleAvatars.slice(0, WITH_EXTRA_COUNT_AVATAR_COUNT),
    extraCount: 5,
    extraTooltip: <span>+5 autres instruments</span>,
  },
};

export const Empty: Story = {
  args: {
    avatars: [],
    emptyMessage: 'Aucun participant',
  },
};

export const SingleAvatar: Story = {
  args: {
    avatars: [sampleAvatars[0]],
  },
};

const LARGE_SIZE_AVATAR_COUNT = 3;

export const LargeSize: Story = {
  args: {
    avatars: sampleAvatars.slice(0, LARGE_SIZE_AVATAR_COUNT),
    size: 'sm',
  },
};

export const MaxAndExtra: Story = {
  args: {
    avatars: sampleAvatars,
    max: 2,
    extraCount: 8,
    extraTooltip: <span>+8 d&apos;autres pupitres</span>,
  },
};
