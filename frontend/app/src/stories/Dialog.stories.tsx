import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeading,
  DialogTrigger,
} from '../components/dialog';
import Button from '../components/button';

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Dialog>
      <DialogTrigger>
        <Button>Ouvrir le dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogClose />
        <DialogHeading>Confirmer l&apos;action</DialogHeading>
        <DialogDescription>
          Êtes-vous sûr de vouloir effectuer cette action ? Cette opération ne peut pas être annulée.
        </DialogDescription>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="outline">Annuler</Button>
          <Button>Confirmer</Button>
        </div>
      </DialogContent>
    </Dialog>
  ),
};

export const WithForm: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline">Modifier le nom</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogClose />
        <DialogHeading>Modifier votre nom</DialogHeading>
        <DialogDescription>
          Entrez votre nouveau nom ci-dessous.
        </DialogDescription>
        <div className="mt-4">
          <input
            type="text"
            placeholder="Nouveau nom"
            className="block w-full border-gray-200 rounded py-2 px-4 border focus:outline-none focus:border-pourpre-400 focus:ring-1 focus:ring-pourpre-400"
          />
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="outline">Annuler</Button>
          <Button>Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  ),
};

export const DangerAction: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline">Supprimer le compte</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogClose />
        <DialogHeading>Supprimer votre compte</DialogHeading>
        <DialogDescription>
          Cette action est irréversible. Toutes vos données seront définitivement supprimées.
        </DialogDescription>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="outline">Annuler</Button>
          <Button className="bg-red-600 border-red-600 hover:bg-red-700">Supprimer</Button>
        </div>
      </DialogContent>
    </Dialog>
  ),
};
