import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const meta = {
  title: 'Components/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      options: ['default', 'destructive'],
      control: { type: 'select' },
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {
  render: () => (
    <Alert variant="destructive">
      <CircleX />
      <AlertTitle>Erreur</AlertTitle>
      <AlertDescription>Une erreur est survenue.</AlertDescription>
    </Alert>
  ),
};

export const Warning: Story = {
  render: () => (
    <Alert>
      <TriangleAlert />
      <AlertTitle>Attention</AlertTitle>
      <AlertDescription>Vérifiez les informations saisies.</AlertDescription>
    </Alert>
  ),
};

export const Success: Story = {
  render: () => (
    <Alert>
      <CircleCheck />
      <AlertTitle>Succès</AlertTitle>
      <AlertDescription>L’opération a bien été effectuée.</AlertDescription>
    </Alert>
  ),
};

export const InfoAlert: Story = {
  render: () => (
    <Alert>
      <Info />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>Une nouvelle version est disponible.</AlertDescription>
    </Alert>
  ),
};
