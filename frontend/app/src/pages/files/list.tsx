import { AlertCircle, CloudUpload, FolderPlus, Trash2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { type FileOrFolder, FileOrFolderType } from 'bagad-client';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient, usePermissions } from '../../config/client';
import FileItem, { FileItemSkeleton } from './components/file-item';

function DeleteFileDialog({
  file, isPending, onConfirm, onClose,
}: {
  file?: FileOrFolder;
  isPending: boolean;
  onConfirm: (fileId: number) => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open={file !== undefined} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia><AlertCircle className="text-destructive" /></AlertDialogMedia>
          <AlertDialogTitle>Supprimer un fichier</AlertDialogTitle>
          <AlertDialogDescription>Vous vous apprêtez à supprimer le fichier <strong>{file?.name}</strong>. Êtes-vous sûr de vouloir supprimer ce fichier ?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={file === undefined || isPending}
            onClick={() => { if (file) onConfirm(file.id); }}
          >
            {isPending ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function NameDialog({
  open, title, description, label, submitLabel, initialValue = '', isPending, onSubmit, onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  label: string;
  submitLabel: string;
  initialValue?: string;
  isPending: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialValue);
  const trimmed = name.trim();
  const submit = () => { if (trimmed) onSubmit(trimmed); };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <Field>
          <FieldLabel htmlFor="name">{label}</FieldLabel>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button disabled={!trimmed || isPending} onClick={submit}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Splits a file name into its base name and extension.
 * The extension includes the leading dot (e.g. `.pdf`). A leading dot with no
 * further dot (dotfiles like `.gitignore`) is treated as having no extension.
 */
function splitFileName(fileName: string): { base: string; extension: string } {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return { base: fileName, extension: '' };
  }
  return { base: fileName.slice(0, dotIndex), extension: fileName.slice(dotIndex) };
}

function RenameDialog({
  file, isPending, onSubmit, onClose,
}: {
  file: FileOrFolder;
  isPending: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const { base, extension } = splitFileName(file.name);
  const hasExtension = extension !== '';

  // When the extension is hidden, we only edit the base name and re-append the
  // extension on submit. When "renameFullName" is checked, we edit the full name.
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
                // Keep both inputs in sync when toggling so the user never loses their edits.
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

function useFolder(folderId?: string) {
  const { filesApi } = useApiClient();
  const { data: folder } = useQuery({
    queryKey: ['files', folderId ?? 'root'],
    queryFn: async () => (
      folderId === undefined
        ? await filesApi.getRootApiV1FilesRootGet()
        : await filesApi.getFileApiV1FilesFileIdGet({ fileId: parseInt(folderId, 10) })
    ),
  });
  const { data: children, status } = useQuery({
    queryKey: ['files', 'children', folder?.id],
    queryFn: async () => {
      if (!folder?.id) throw new Error('Invalid id');
      return await filesApi.listChildrenApiV1FilesFolderIdChildrenGet({ folderId: folder.id });
    },
    select: (data) => ({
      folders: data.filter((value) => value.type === FileOrFolderType.Dir),
      files: data.filter((value) => value.type === FileOrFolderType.File),
    }),
    enabled: !!folder?.id,
  });
  const { data: breadcrumb } = useQuery({
    queryKey: ['files', 'breadcrumb', folder?.id],
    queryFn: async () => {
      if (!folder?.id) throw new Error('Invalid id');
      return await filesApi.getBreadcrumbApiV1FilesFileIdBreadcrumbGet({ fileId: folder.id });
    },
    enabled: !!folder?.id,
  });
  return { folder, children, status, breadcrumb };
}

function useFileMutations(folderId?: number) {
  const { filesApi } = useApiClient();
  const invalidateChildren = async () => await queryClient.invalidateQueries({ queryKey: ['files', 'children', folderId] });

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      if (!folderId) return await Promise.reject(new Error('Dossier introuvable'));
      return await filesApi.createFolderApiV1FilesFolderIdPost({ folderId, folderCreate: { name } });
    },
    onSettled: invalidateChildren,
  });
  const uploadFiles = useMutation({
    mutationFn: async (acceptedFiles: File[]) => {
      if (!folderId) return await Promise.reject(new Error('Dossier introuvable'));
      return await Promise.all(acceptedFiles.map(async (file) => await filesApi.uploadFileApiV1FilesFolderIdUploadPost({ folderId, file })));
    },
    onSettled: invalidateChildren,
    onSuccess: (data) => toast.add({ title: `${data.length} fichier(s) envoyé(s) avec succès.`, type: 'success' }),
  });
  const deleteFile = useMutation({
    mutationFn: async (fileId: number) => await filesApi.deleteFileApiV1FilesFileIdDelete({ fileId }),
    onSettled: invalidateChildren,
  });
  const renameFile = useMutation({
    mutationFn: async ({ fileId, name }: { fileId: number; name: string }) => await filesApi.updateFileApiV1FilesFileIdPut({
      fileId,
      fileOrFolderUpdate: { name, parentId: folderId ?? 0 },
    }),
    onSettled: invalidateChildren,
  });

  return { createFolder, uploadFiles, deleteFile, renameFile };
}

function buildBreadcrumb(folderId: string | undefined, breadcrumb?: FileOrFolder[]) {
  if (!folderId) return [{ title: 'Fichiers' }];
  return [
    { title: 'Fichiers', link: '/files' },
    ...(breadcrumb?.slice(1, -1).map((item) => ({ title: item.name, link: `/files/${item.id}` })) ?? []),
    ...(breadcrumb?.slice(-1).map((item) => ({ title: item.name })) ?? []),
  ];
}

function FolderBody({
  status, content, isDragActive, onDelete, onRename,
}: {
  status: 'pending' | 'error' | 'success';
  content?: { folders: FileOrFolder[]; files: FileOrFolder[] };
  isDragActive: boolean;
  onDelete: (file: FileOrFolder) => void;
  onRename: (file: FileOrFolder) => void;
}) {
  if (status === 'pending') {
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><FileItemSkeleton /><FileItemSkeleton /></div>
        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><FileItemSkeleton big /></div>
      </>
    );
  }
  if (status === 'error' || !content) {
    return (
      <Alert variant="destructive"><AlertCircle /><AlertTitle>Erreur</AlertTitle><AlertDescription>Impossible de charger ce dossier.</AlertDescription></Alert>
    );
  }
  return (
    <>
      {isDragActive ? <div className="absolute z-10 size-full rounded-lg border-2 border-primary bg-primary/10" /> : null}
      {!content.files.length && !content.folders.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CloudUpload /></EmptyMedia>
            <EmptyTitle>Dossier vide</EmptyTitle>
            <EmptyDescription>Déposez des fichiers ici ou utilisez le bouton pour en ajouter.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {content.folders.map((file) => <FileItem key={file.id} file={file} deleteFn={() => onDelete(file)} renameFn={() => onRename(file)} />)}
      </div>
      <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {content.files.map((file) => <FileItem key={file.id} file={file} big deleteFn={() => onDelete(file)} renameFn={() => onRename(file)} />)}
      </div>
    </>
  );
}

export default function ListFilesPage() {
  const { can } = usePermissions();
  const params = useParams();
  const { folder, children, status, breadcrumb } = useFolder(params.folderId);
  const { createFolder, uploadFiles, deleteFile, renameFile } = useFileMutations(folder?.id);

  const [fileToDelete, setFileToDelete] = useState<FileOrFolder | undefined>(undefined);
  const [fileToRename, setFileToRename] = useState<FileOrFolder | undefined>(undefined);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => uploadFiles.mutate(acceptedFiles),
    noClick: true,
    noKeyboard: true,
  });

  return (
    <>
      <Header
        title="Fichiers"
        subtitle={folder?.name ?? <Skeleton className="h-4 w-32" />}
        breadcrumb={buildBreadcrumb(params.folderId, breadcrumb)}
        actions={can('create', 'file') ? [
          <label key="upload-file" className={cn(buttonVariants({ variant: 'outline' }), 'w-full cursor-pointer md:w-auto')}>
            <CloudUpload data-icon="inline-start" />
            Ajouter un fichier
            <input {...getInputProps()} />
          </label>,
          <Header.Action key="add-folder" type="button" className="w-full md:w-auto" onClick={() => setCreatingFolder(true)}>
            <FolderPlus data-icon="inline-start" />
            Créer un dossier
          </Header.Action>,
        ] : []}
      />
      <Container>
        <div {...getRootProps({ className: 'relative' })}>
          <FolderBody
            status={status}
            content={children}
            isDragActive={isDragActive}
            onDelete={setFileToDelete}
            onRename={setFileToRename}
          />
        </div>
      </Container>

      <DeleteFileDialog
        file={fileToDelete}
        isPending={deleteFile.isPending}
        onConfirm={(fileId) => deleteFile.mutate(fileId, { onSettled: () => setFileToDelete(undefined) })}
        onClose={() => setFileToDelete(undefined)}
      />

      {fileToRename ? (
        <RenameDialog
          file={fileToRename}
          isPending={renameFile.isPending}
          onSubmit={(name) => renameFile.mutate({ fileId: fileToRename.id, name }, { onSettled: () => setFileToRename(undefined) })}
          onClose={() => setFileToRename(undefined)}
        />
      ) : null}

      {creatingFolder ? (
        <NameDialog
          open
          title="Créer un dossier"
          description={`Le dossier sera créé dans « ${folder?.name ?? ''} ».`}
          label="Nom du dossier"
          submitLabel="Créer"
          isPending={createFolder.isPending}
          onSubmit={(name) => createFolder.mutate(name, { onSettled: () => setCreatingFolder(false) })}
          onClose={() => setCreatingFolder(false)}
        />
      ) : null}

      <Dialog open={uploadFiles.isPending}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CloudUpload />Envoi des fichiers...</DialogTitle>
            <DialogDescription>Les fichiers sélectionnés sont en cours d&apos;envoi.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
