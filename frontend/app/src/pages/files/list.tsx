import { AlertCircle, CloudUpload, File, Folder, FolderPlus } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { type FileOrFolder, type FileOrFolderUpdate, FileOrFolderType, ResponseError } from 'bagad-client';
import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import Container from '../../components/container';
import Header from '../../components/header';
import { queryClient, useApiClient, usePermissions } from '../../config/client';
import FileItem, { FileItemSkeleton } from './components/file-item';
import { ContainerStatus } from './components/container-view';
import CreateFolderDialog from './components/dialogs/create-folder-dialog';
import DeleteFileDialog from './components/dialogs/delete-file-dialog';
import FileDetailsDialog from './components/dialogs/file-details-dialog';
import MoveDialog from './components/dialogs/move-dialog';
import RenameDialog from './components/dialogs/rename-dialog';
import UploadProgressDialog from './components/dialogs/upload-progress-dialog';
import Suggestions from './components/suggestions';
import { useBatchUpload } from './use-batch-upload';
import { useFolder } from './use-folder';
import { useSuggestions } from './use-suggestions';

const AUTOCLOSE_DELAY_MS = 1000;
const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;

function updateErrorMessage(error: unknown): string {
  if (error instanceof ResponseError) {
    if (error.response.status === HTTP_CONFLICT) {
      return 'Un élément du même nom existe déjà dans ce dossier.';
    }
    if (error.response.status === HTTP_BAD_REQUEST) {
      return 'Destination invalide.';
    }
  }
  return 'La modification a échoué.';
}

function parseFolderId(param?: string): number | undefined {
  return param === undefined ? undefined : parseInt(param, 10);
}

function splitChildren(children?: FileOrFolder[]) {
  if (!children) return undefined;
  return {
    folders: children.filter((value) => value.type === FileOrFolderType.Dir || value.type === FileOrFolderType.Container),
    files: children.filter((value) => value.type === FileOrFolderType.File),
  };
}

function useFileMutations(folderId?: number) {
  const { filesApi } = useApiClient();
  const invalidateChildren = async () => await queryClient.invalidateQueries({ queryKey: ['files', folderId] });

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      if (!folderId) return await Promise.reject(new Error('Dossier introuvable'));
      return await filesApi.createFolderApiV1FilesFolderIdPost({ folderId, folderCreate: { name } });
    },
    onSettled: invalidateChildren,
  });
  const deleteFile = useMutation({
    mutationFn: async (fileId: number) => await filesApi.deleteFileApiV1FilesFileIdDelete({ fileId }),
    onSettled: invalidateChildren,
  });
  const updateFile = useMutation({
    mutationFn: async ({ fileId, ...patch }: { fileId: number } & FileOrFolderUpdate) => await filesApi.updateFileApiV1FilesFileIdPatch({
      fileId,
      fileOrFolderUpdate: patch,
    }),
    onSettled: async () => await queryClient.invalidateQueries({ queryKey: ['files'] }),
  });

  return { createFolder, deleteFile, updateFile };
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
  status, content, isDragActive, canCreate, onDelete, onRename, onMove, onDetails,
}: {
  status: 'pending' | 'error' | 'success';
  content?: { folders: FileOrFolder[]; files: FileOrFolder[] };
  isDragActive: boolean;
  canCreate: boolean;
  onDelete?: (file: FileOrFolder) => void;
  onRename?: (file: FileOrFolder) => void;
  onMove?: (file: FileOrFolder) => void;
  onDetails: (file: FileOrFolder) => void;
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
    <section aria-label="Contenu du dossier">
      {isDragActive ? <div className="absolute z-10 size-full rounded-lg border-2 border-primary bg-primary/10" /> : null}
      {!content.files.length && !content.folders.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CloudUpload /></EmptyMedia>
            <EmptyTitle>Dossier vide</EmptyTitle>
            <EmptyDescription>
              {canCreate
                ? 'Déposez des fichiers ici ou utilisez le bouton pour en ajouter.'
                : 'Ce dossier ne contient aucun fichier.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {content.folders.length ? (
        <>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Folder className="size-4 text-primary" aria-hidden="true" />
            Dossiers
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {content.folders.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                deleteFn={onDelete && (() => onDelete(file))}
                renameFn={onRename && file.type !== FileOrFolderType.Container ? () => onRename(file) : undefined}
                moveFn={onMove && (() => onMove(file))}
                detailsFn={() => onDetails(file)}
              />
            ))}
          </div>
        </>
      ) : null}
      {content.files.length ? (
        <>
          <h2 className="mb-3 mt-16 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <File className="size-4 text-muted-foreground" aria-hidden="true" />
            Fichiers
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {content.files.map((file) => <FileItem key={file.id} file={file} big deleteFn={onDelete && (() => onDelete(file))} renameFn={onRename && (() => onRename(file))} moveFn={onMove && (() => onMove(file))} detailsFn={() => onDetails(file)} />)}
          </div>
        </>
      ) : null}
    </section>
  );
}

function FilesHeader({
  folder, folderId, breadcrumb, canCreate, uploadInputProps, onCreateFolder,
}: {
  folder?: FileOrFolder;
  folderId?: string;
  breadcrumb?: FileOrFolder[];
  canCreate: boolean;
  uploadInputProps: React.InputHTMLAttributes<HTMLInputElement>;
  onCreateFolder: () => void;
}) {
  let actions: React.ReactElement[] = [];
  if (folder?.type !== FileOrFolderType.Container && canCreate) {
    actions = [
      <label key="upload-file" className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}>
        <CloudUpload data-icon="inline-start" />
        Ajouter un fichier
        <input {...uploadInputProps} className="sr-only" />
      </label>,
      <Header.Action key="add-folder" type="button" onClick={onCreateFolder}>
        <FolderPlus data-icon="inline-start" />
        Créer un dossier
      </Header.Action>,
    ];
  }
  return (
    <Header
      title="Fichiers"
      subtitle={folder?.name ?? <Skeleton className="h-4 w-32" />}
      breadcrumb={buildBreadcrumb(folderId, breadcrumb)}
      actions={actions}
    />
  );
}

function effectivePermissions(
  can: (action: string, resource: string) => boolean,
  isContainer: boolean,
) {
  return {
    canWriteHere: can('create', 'file') && !isContainer,
    canDeleteHere: can('delete', 'file') && !isContainer,
    canRenameHere: can('edit', 'file') && !isContainer,
    canMoveHere: can('edit', 'file') && !isContainer,
  };
}

export default function ListFilesPage() {
  const { can } = usePermissions();
  const params = useParams();
  const { folder, children, status, breadcrumb } = useFolder(parseFolderId(params.folderId));
  const content = splitChildren(children);
  const { createFolder, deleteFile, updateFile } = useFileMutations(folder?.id);
  const { data: suggestions, isPending: suggestionsPending } = useSuggestions(folder?.id);

  const invalidateChildren = async () => await queryClient.invalidateQueries({ queryKey: ['files', folder?.id] });
  const upload = useBatchUpload(folder?.id, invalidateChildren);

  const allDone = upload.active && upload.items.length > 0
    && upload.items.every((item) => item.status === 'done');
  useEffect(() => {
    if (!allDone) return undefined;
    const count = upload.items.length;
    const timer = setTimeout(() => {
      upload.close();
      toast.add({ title: `${count} fichier(s) envoyé(s) avec succès.`, type: 'success' });
    }, AUTOCLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [allDone, upload]);

  const isContainer = folder?.type === FileOrFolderType.Container;
  const { canWriteHere, canDeleteHere, canRenameHere, canMoveHere } = effectivePermissions(can, isContainer);

  const [fileToDelete, setFileToDelete] = useState<FileOrFolder | undefined>(undefined);
  const [fileToRename, setFileToRename] = useState<FileOrFolder | undefined>(undefined);
  const [fileToMove, setFileToMove] = useState<FileOrFolder | undefined>(undefined);
  const [fileToShow, setFileToShow] = useState<FileOrFolder | undefined>(undefined);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => { void upload.start(acceptedFiles); },
    noClick: true,
    noKeyboard: true,
    noDrag: !canWriteHere,
  });

  const containerStatus = folder?.type === FileOrFolderType.Container
    ? <ContainerStatus container={folder} />
    : null;

  const submitUpdate = (file: FileOrFolder, patch: FileOrFolderUpdate, successTitle: string, close: () => void) => {
    updateFile.mutate({ fileId: file.id, ...patch }, {
      onSuccess: () => {
        toast.add({ title: successTitle, type: 'success' });
        close();
      },
      onError: (error) => toast.add({ title: updateErrorMessage(error), type: 'error' }),
    });
  };

  return (
    <>
      <FilesHeader
        folder={folder}
        folderId={params.folderId}
        breadcrumb={breadcrumb}
        canCreate={canWriteHere}
        uploadInputProps={getInputProps()}
        onCreateFolder={() => setCreatingFolder(true)}
      />
      <Container>
        {containerStatus}
        {!isContainer && status === 'success' ? (
          <Suggestions suggestions={suggestions} isPending={suggestionsPending} />
        ) : null}
        <div {...getRootProps({ className: 'relative' })}>
          <FolderBody
            status={status}
            content={content}
            isDragActive={isDragActive}
            canCreate={canWriteHere}
            onDelete={canDeleteHere ? setFileToDelete : undefined}
            onRename={canRenameHere ? setFileToRename : undefined}
            onMove={canMoveHere ? setFileToMove : undefined}
            onDetails={setFileToShow}
          />
        </div>
      </Container>

      <DeleteFileDialog
        file={fileToDelete}
        isPending={deleteFile.isPending}
        onConfirm={(fileId) => deleteFile.mutate(fileId, { onSettled: () => setFileToDelete(undefined) })}
        onClose={() => setFileToDelete(undefined)}
      />
      <FileDetailsDialog
        file={fileToShow}
        onClose={() => setFileToShow(undefined)}
      />
      {fileToRename ? (
        <RenameDialog
          file={fileToRename}
          isPending={updateFile.isPending}
          onSubmit={(name) => submitUpdate(fileToRename, { name }, `« ${name} » renommé.`, () => setFileToRename(undefined))}
          onClose={() => setFileToRename(undefined)}
        />
      ) : null}
      {fileToMove ? (
        <MoveDialog
          file={fileToMove}
          isPending={updateFile.isPending}
          onSubmit={(parentId) => submitUpdate(fileToMove, { parentId }, `« ${fileToMove.name} » déplacé.`, () => setFileToMove(undefined))}
          onClose={() => setFileToMove(undefined)}
        />
      ) : null}
      <CreateFolderDialog
        open={creatingFolder}
        folderName={folder?.name}
        isPending={createFolder.isPending}
        onSubmit={(name) => createFolder.mutate(name, { onSettled: () => setCreatingFolder(false) })}
        onClose={() => setCreatingFolder(false)}
      />
      <UploadProgressDialog
        open={upload.active}
        items={upload.items}
        onResolveConflict={(id, overwrite) => { void upload.resolveConflict(id, overwrite); }}
        onClose={upload.close}
      />
    </>
  );
}
