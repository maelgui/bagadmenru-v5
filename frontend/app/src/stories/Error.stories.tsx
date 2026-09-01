import type { Meta, StoryObj } from '@storybook/react-vite';
import Error from '../components/error';

const meta = {
  title: 'Components/Error',
  component: Error,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Error>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    error: 'Impossible de charger la liste des membres.',
  },
};

export const WithoutMessage: Story = {
  args: {
    error: undefined,
  },
};
