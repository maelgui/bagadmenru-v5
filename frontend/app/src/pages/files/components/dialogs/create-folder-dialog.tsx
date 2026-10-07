import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export default function CreateFolderDialog({
  open, folderName, isPending, onSubmit, onClose,
}: {
  open: boolean;
  folderName?: string;
  isPending: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const submit = () => { if (trimmed) onSubmit(trimmed); };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un dossier</DialogTitle>
          <DialogDescription>{`Le dossier sera créé dans « ${folderName ?? ''} ».`}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="folder-name">Nom du dossier</FieldLabel>
          <Input
            id="folder-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button disabled={!trimmed || isPending} onClick={submit}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
