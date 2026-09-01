import type { Meta, StoryObj } from '@storybook/react-vite';
import Counter from '../components/counter';

const meta = {
  title: 'Components/Counter',
  component: Counter,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      options: ['error', 'warning', 'success', 'info', 'ghost'],
      control: { type: 'select' },
    },
  },
} satisfies Meta<typeof Counter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    type: 'success',
    value: 42,
    description: 'Membres actifs',
  },
};

export const Error: Story = {
  args: {
    type: 'error',
    value: 3,
    description: 'Cotisations en retard',
  },
};

export const Info: Story = {
  args: {
    type: 'info',
    value: 12,
    description: 'Événements à venir',
  },
};

export const Grid: Story = {
  args: {
    type: 'success',
    value: 0,
    description: '',
  },
  render: () => (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Counter type="success" value={42} description="Membres" />
      <Counter type="info" value={12} description="Événements" />
      <Counter type="warning" value={5} description="En attente" />
      <Counter type="error" value={3} description="En retard" />
    </div>
  ),
};
