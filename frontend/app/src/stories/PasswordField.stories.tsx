import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
import type { ComponentProps } from 'react';
import PasswordField from '@/components/PasswordField';

const meta = {
  title: 'Components/PasswordField',
  component: PasswordField,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    id: 'password',
    label: 'Mot de passe',
    autoComplete: 'current-password',
  },
  // PasswordField expects a react-hook-form registration. `render` supplies a
  // real one via useForm() so the field renders standalone in the canvas.
  render: (args) => {
    const { register } = useForm<{ password: string }>();
    return <PasswordField {...args} registration={register('password')} />;
  },
} satisfies Meta<typeof PasswordField>;

export default meta;

// `registration` is injected by `render`, so story authors omit it; model the
// story args with that prop optional.
type Story = StoryObj<Omit<ComponentProps<typeof PasswordField>, 'registration'>>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: 'Le mot de passe doit contenir au moins 8 caractères',
  },
};
