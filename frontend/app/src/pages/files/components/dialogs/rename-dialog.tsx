import type { FileOrFolder } from 'bagad-client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

function splitFileName(fileName: string): { base: string; extension: string } {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return { base: fileName, extension: '' };
  }
  return { base: fileName.slice(0, dotIndex), extension: fileName.slice(dotIndex) };
}

export default function RenameDialog({
  file, isPending, onSubmit, onClose,
}: {
  file: FileOrFolder;
  isPending: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const { base, extension } = splitFileName(file.name);
  const hasExtension = extension !== '';

  const [baseName, setBaseName] = useState(base);
  const [fullName, setFullName] = useState(file.name);
  const [renameFullName, setRenameFullName] = useState(!hasExtension);

  const editingFull = renameFullName || !hasExtension;
  const finalName = editingFull ? fullName.trim() : `${baseName.trim()}${extension}`;
  const canSubmit = editingFull ? fullName.trim() !== '' : baseName.trim() !== '';
  const submit = () => { if (canSubmit) onSubmit(finalName); };

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renommer</DialogTitle>
          <DialogDescription>Choisissez un nouveau nom pour ce fichier.</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="rename-input">Nouveau nom</FieldLabel>
          {editingFull ? (
            <Input
              id="rename-input"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
            />
          ) : (
            <div className="flex items-center gap-1">
              <Input
                id="rename-input"
                className="flex-1"
                value={baseName}
                onChange={(event) => setBaseName(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
              />
              <span className="text-muted-foreground text-sm select-none">{extension}</span>
            </div>
          )}
        </Field>
        {hasExtension ? (
          <Field orientation="horizontal">
            <Checkbox
              id="rename-full-name"
              checked={renameFullName}
              onCheckedChange={(checked) => {
                const next = checked;
                setRenameFullName(next);
                if (next) setFullName(`${baseName.trim()}${extension}`);
                else {
                  const parts = splitFileName(fullName.trim());
                  setBaseName(parts.base);
                }
              }}
            />
            <FieldLabel htmlFor="rename-full-name" className="font-normal">
              Renommer le fichier entièrement (extension comprise)
            </FieldLabel>
          </Field>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button disabled={!canSubmit || isPending} onClick={submit}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Renommer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
