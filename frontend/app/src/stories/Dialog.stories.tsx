import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

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
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button />}>Ouvrir le dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer l’action</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir effectuer cette action ? Cette opération ne
            peut pas être annulée.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
          <Button>Confirmer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Modifier le nom</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier votre nom</DialogTitle>
          <DialogDescription>Entrez votre nouveau nom ci-dessous.</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="dialog-name">Nouveau nom</FieldLabel>
          <Input id="dialog-name" type="text" placeholder="Nouveau nom" />
        </Field>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
          <Button>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const DangerAction: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Supprimer le compte</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer votre compte</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Toutes vos données seront
            définitivement supprimées.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
          <Button variant="destructive">Supprimer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
