import { ChevronRight, FolderInput, Home } from 'lucide-react';
import { type FileOrFolder, FileOrFolderType } from 'bagad-client';
import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useFolder } from '../../use-folder';

function FolderRow({ folder, onOpen }: { folder: FileOrFolder; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
    >
      <FolderInput className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="flex-1 truncate">{folder.name}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

function FolderList({
  status, items, onOpen,
}: {
  status: 'pending' | 'error' | 'success';
  items: FileOrFolder[] | undefined;
  onOpen: (folder: FileOrFolder) => void;
}) {
  if (status === 'pending') {
    return (
      <div className="space-y-1 p-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  if (!items || items.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon"><FolderInput /></EmptyMedia>
          <EmptyTitle>Aucun sous-dossier</EmptyTitle>
          <EmptyDescription>Déplacez l&apos;élément ici ou revenez en arrière.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="flex flex-col">
      {items.map((child) => (
        <FolderRow key={child.id} folder={child} onOpen={() => onOpen(child)} />
      ))}
    </div>
  );
}

export default function MoveDialog({
  file, isPending, onSubmit, onClose,
}: {
  file: FileOrFolder;
  isPending: boolean;
  onSubmit: (parentId: number) => void;
  onClose: () => void;
}) {
  const [currentId, setCurrentId] = useState<number | undefined>(undefined);
  const { folder, children, status, breadcrumb } = useFolder(currentId);
  const folders = children?.filter((item) => item.type === FileOrFolderType.Dir);

  const targetId = folder?.id;
  const isSameParent = targetId != null && targetId === file.parentId;
  const canSubmit = targetId != null && !isSameParent;
  const submit = () => {
    if (canSubmit) onSubmit(targetId);
  };

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Déplacer</DialogTitle>
          <DialogDescription>
            Choisissez le dossier de destination pour <strong>{file.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => setCurrentId(undefined)}
            className="flex items-center gap-1 rounded px-1 hover:text-foreground"
          >
            <Home className="size-4" aria-hidden />
            Fichiers
          </button>
          {breadcrumb?.slice(1).map((item) => (
            <Fragment key={item.id}>
              <ChevronRight className="size-3.5" aria-hidden />
              <button
                type="button"
                onClick={() => setCurrentId(item.id)}
                className="truncate rounded px-1 hover:text-foreground"
              >
                {item.name}
              </button>
            </Fragment>
          ))}
        </nav>

        <div className="min-h-48 rounded-md border p-1">
          <FolderList status={status} items={folders} onOpen={(next) => setCurrentId(next.id)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button disabled={!canSubmit || isPending} onClick={submit}>
            {isPending ? <Spinner data-icon="inline-start" /> : <FolderInput data-icon="inline-start" />}
            {isSameParent ? 'Déjà dans ce dossier' : 'Déplacer ici'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
