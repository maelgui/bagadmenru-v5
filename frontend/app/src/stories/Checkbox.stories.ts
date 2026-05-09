import type { Meta, StoryObj } from '@storybook/react-vite';
import Checkbox from '../components/checkbox';

const meta = {
  component: Checkbox,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'checkbox-default',
    title: 'Notifications par email',
    description: 'Recevoir un email pour chaque nouvel événement publié.',
  },
};

export const Checked: Story = {
  args: {
    id: 'checkbox-checked',
    title: 'Notifications push',
    description: 'Recevoir une notification push sur votre appareil.',
    defaultChecked: true,
  },
};

export const LongContent: Story = {
  args: {
    id: 'checkbox-long',
    title: 'Accepter les conditions',
    description:
      'En cochant cette case, vous acceptez les conditions générales d\'utilisation et la politique de confidentialité du site. Vos données seront traitées conformément au RGPD.',
  },
};
