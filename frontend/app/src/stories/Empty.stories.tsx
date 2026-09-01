import { FolderOpen } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'Components/Empty',
  component: Empty,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Empty className="w-96 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen />
        </EmptyMedia>
        <EmptyTitle>Aucun fichier</EmptyTitle>
        <EmptyDescription>
          Ce dossier est vide. Importez des fichiers pour commencer.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Importer des fichiers</Button>
      </EmptyContent>
    </Empty>
  ),
};

export const Minimal: Story = {
  render: () => (
    <Empty className="w-96 border">
      <EmptyHeader>
        <EmptyTitle>Aucun résultat</EmptyTitle>
        <EmptyDescription>Aucun membre ne correspond à votre recherche.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};
