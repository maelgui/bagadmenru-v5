import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toaster, toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';

/**
 * Toasts are emitted imperatively via the `toast` manager and rendered by a
 * single `<Toaster>` mounted at the app root. Each story wraps its trigger in a
 * `<Toaster>` so the toast has somewhere to render.
 */
const meta = {
  title: 'Components/Toast',
  component: Toaster,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  render: () => (
    <Toaster>
      <Button
        onClick={() =>
          toast.add({ title: 'Groupe créé !', type: 'success' })
        }
      >
        Afficher un toast de succès
      </Button>
    </Toaster>
  ),
};

export const Error: Story = {
  render: () => (
    <Toaster>
      <Button
        variant="destructive"
        onClick={() =>
          toast.add({
            title: 'Erreur réseau',
            description: 'Impossible de contacter le serveur.',
            type: 'error',
          })
        }
      >
        Afficher un toast d’erreur
      </Button>
    </Toaster>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Toaster>
      <Button
        variant="outline"
        onClick={() =>
          toast.add({
            title: 'Fichier supprimé',
            description: 'Le fichier a été déplacé dans la corbeille.',
            type: 'info',
            actionProps: {
              children: 'Annuler',
              onClick: () => toast.add({ title: 'Suppression annulée', type: 'success' }),
            },
          })
        }
      >
        Toast avec action
      </Button>
    </Toaster>
  ),
};
