import { ChevronRight, FolderInput, Home } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
import { cn } from '@/lib/utils';
import { useApiClient } from '../../../../config/client';

function useFolderContent(folderId?: number) {
  const { filesApi } = useApiClient();
  const { data: folder } = useQuery({
    queryKey: ['files', folderId ?? 'root'],
    queryFn: async () => (
      folderId === undefined
        ? await filesApi.getRootApiV1FilesRootGet()
        : await filesApi.getFileApiV1FilesFileIdGet({ fileId: folderId })
    ),
  });
  const { data: children, status } = useQuery({
    queryKey: ['files', folder?.id, 'children'],
    queryFn: async () => {
      if (!folder?.id) throw new Error('Invalid id');
      return await filesApi.listChildrenApiV1FilesFolderIdChildrenGet({ folderId: folder.id });
    },
    select: (data) => data.filter((item) => item.type === FileOrFolderType.Dir),
    enabled: !!folder?.id,
  });
  return { folder, children, status };
}

function FolderRow({
  folder, disabled, onOpen,
}: {
  folder: FileOrFolder;
  disabled: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onOpen}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-muted',
      )}
    >
      <FolderInput className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="flex-1 truncate">{folder.name}</span>
      {!disabled ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </button>
  );
}

export default function MoveDialog({
  file, isPending, onSubmit, onClose,
}: {
  file: FileOrFolder;
  isPending: boolean;
  onSubmit: (targetParentId: number) => void;
  onClose: () => void;
}) {
  const [path, setPath] = useState<FileOrFolder[]>([]);
  const currentId = path.length ? path[path.length - 1].id : undefined;
  const { folder, children, status } = useFolderContent(currentId);

  const openFolder = (next: FileOrFolder) => setPath((prev) => [...prev, next]);
  const goTo = (index: number) => setPath((prev) => prev.slice(0, index + 1));
  const goHome = () => setPath([]);

  const targetId = folder?.id;
  const isSameParent = targetId != null && targetId === file.parentId;
  const isSelf = targetId != null && targetId === file.id;
  const canSubmit = targetId != null && !isSameParent && !isSelf;
  const submit = () => {
    if (targetId != null && !isSameParent && !isSelf) onSubmit(targetId);
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
            onClick={goHome}
            className="flex items-center gap-1 rounded px-1 hover:text-foreground"
          >
            <Home className="size-4" aria-hidden />
            Fichiers
          </button>
          {path.map((item, index) => (
            <Fragment key={item.id}>
              <ChevronRight className="size-3.5" aria-hidden />
              <button
                type="button"
                onClick={() => goTo(index)}
                className="truncate rounded px-1 hover:text-foreground"
              >
                {item.name}
              </button>
            </Fragment>
          ))}
        </nav>

        <div className="min-h-48 rounded-md border p-1">
          {status === 'pending' ? (
            <div className="space-y-1 p-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !children || children.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon"><FolderInput /></EmptyMedia>
                <EmptyTitle>Aucun sous-dossier</EmptyTitle>
                <EmptyDescription>Déplacez l&apos;élément ici ou revenez en arrière.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col">
              {children.map((child) => (
                <FolderRow
                  key={child.id}
                  folder={child}
                  disabled={child.id === file.id}
                  onOpen={() => openFolder(child)}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button disabled={!canSubmit || isPending} onClick={submit}>
            {isPending ? <Spinner data-icon="inline-start" /> : <FolderInput data-icon="inline-start" />}
            {isSameParent ? 'Déjà dans ce dossier' : `Déplacer ici`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
