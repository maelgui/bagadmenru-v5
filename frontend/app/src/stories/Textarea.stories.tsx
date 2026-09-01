import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from '@/components/ui/textarea';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Écrivez votre message…',
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: 'Le bagad répète tous les mercredis soir à la salle des fêtes.',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Champ désactivé',
    disabled: true,
  },
};

export const Invalid: Story = {
  args: {
    placeholder: 'Champ obligatoire',
    'aria-invalid': true,
  },
};
