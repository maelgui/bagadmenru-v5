import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
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
    // Placeholder to satisfy the required prop for type-checking; the decorator
    // below replaces it at render time with a real react-hook-form registration.
    registration: { name: 'password', onChange: async () => {}, onBlur: async () => {}, ref: () => {} },
  },
  // PasswordField expects a react-hook-form registration. A decorator with a
  // real useForm() supplies a valid one so the field renders standalone.
  decorators: [
    (Story, { args }) => {
      const { register } = useForm<{ password: string }>();
      return <Story args={{ ...args, registration: register('password') }} />;
    },
  ],
} satisfies Meta<typeof PasswordField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: 'Le mot de passe doit contenir au moins 8 caractères',
  },
};
