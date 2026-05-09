import type { Meta, StoryObj } from '@storybook/react-vite';
import Alert from '../components/alert';

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
  component: Alert,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'padded',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    type: {
      options: ['error', 'warning', 'success'],
    },
  },
  args: {
    children: 'Alert',
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Error: Story = {
  args: {
    type: 'error',
  },
};

export const Warning: Story = {
  args: {
    type: 'warning',
  },
};

export const Success: Story = {
  args: {
    type: 'success',
  },
};
export const Gradient: Story = {
  args: {
    type: 'gradient',
  },
};
