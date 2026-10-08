import { AlertCircle, CloudUpload, FolderPlus } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { type FileOrFolder, FileOrFolderType } from 'bagad-client';
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
import RenameDialog from './components/dialogs/rename-dialog';
import UploadProgressDialog from './components/dialogs/upload-progress-dialog';
import { useBatchUpload } from './use-batch-upload';

const CONVERSION_POLL_INTERVAL_MS = 2000;
const AUTOCLOSE_DELAY_MS = 1000;

function isConverting(node?: FileOrFolder): boolean {
  return node?.type === FileOrFolderType.Container
    && node.processingStatus != null
    && node.processingStatus !== 'completed'
    && node.processingStatus !== 'failed';
}

export function useFolder(folderId?: string) {
  const { filesApi } = useApiClient();
  const { data: folder } = useQuery({
    queryKey: ['files', folderId === undefined ? 'root' : parseInt(folderId, 10)],
    queryFn: async () => (
      folderId === undefined
        ? await filesApi.getRootApiV1FilesRootGet()
        : await filesApi.getFileApiV1FilesFileIdGet({ fileId: parseInt(folderId, 10) })
    ),
    refetchInterval: (query) => (isConverting(query.state.data) ? CONVERSION_POLL_INTERVAL_MS : false),
  });
  const converting = isConverting(folder);
  const { data: children, status } = useQuery({
    queryKey: ['files', folder?.id, 'children', folder?.processingStatus],
    queryFn: async () => {
      if (!folder?.id) throw new Error('Invalid id');
      return await filesApi.listChildrenApiV1FilesFolderIdChildrenGet({ folderId: folder.id });
    },
    select: (data) => ({
      folders: data.filter((value) => value.type === FileOrFolderType.Dir || value.type === FileOrFolderType.Container),
      files: data.filter((value) => value.type === FileOrFolderType.File),
    }),
    enabled: !!folder?.id,
    refetchInterval: converting ? CONVERSION_POLL_INTERVAL_MS : false,
  });
  const { data: breadcrumb } = useQuery({
    queryKey: ['files', folder?.id, 'breadcrumb'],
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
  const renameFile = useMutation({
    mutationFn: async ({ fileId, name }: { fileId: number; name: string }) => await filesApi.updateFileApiV1FilesFileIdPut({
      fileId,
      fileOrFolderUpdate: { name, parentId: folderId ?? 0 },
    }),
    onSettled: invalidateChildren,
  });

  return { createFolder, deleteFile, renameFile };
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
  status, content, isDragActive, canCreate, onDelete, onRename, onDetails,
}: {
  status: 'pending' | 'error' | 'success';
  content?: { folders: FileOrFolder[]; files: FileOrFolder[] };
  isDragActive: boolean;
  canCreate: boolean;
  onDelete?: (file: FileOrFolder) => void;
  onRename?: (file: FileOrFolder) => void;
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
    <>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {content.folders.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            deleteFn={onDelete && (() => onDelete(file))}
            renameFn={onRename && file.type !== FileOrFolderType.Container ? () => onRename(file) : undefined}
            detailsFn={() => onDetails(file)}
          />
        ))}
      </div>
      <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {content.files.map((file) => <FileItem key={file.id} file={file} big deleteFn={onDelete && (() => onDelete(file))} renameFn={onRename && (() => onRename(file))} detailsFn={() => onDetails(file)} />)}
      </div>
    </>
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
  };
}

export default function ListFilesPage() {
  const { can } = usePermissions();
  const params = useParams();
  const { folder, children, status, breadcrumb } = useFolder(params.folderId);
  const { createFolder, deleteFile, renameFile } = useFileMutations(folder?.id);

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
  const { canWriteHere, canDeleteHere, canRenameHere } = effectivePermissions(can, isContainer);

  const [fileToDelete, setFileToDelete] = useState<FileOrFolder | undefined>(undefined);
  const [fileToRename, setFileToRename] = useState<FileOrFolder | undefined>(undefined);
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
        <div {...getRootProps({ className: 'relative' })}>
          <FolderBody
            status={status}
            content={children}
            isDragActive={isDragActive}
            canCreate={canWriteHere}
            onDelete={canDeleteHere ? setFileToDelete : undefined}
            onRename={canRenameHere ? setFileToRename : undefined}
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
          isPending={renameFile.isPending}
          onSubmit={(name) => renameFile.mutate({ fileId: fileToRename.id, name }, { onSettled: () => setFileToRename(undefined) })}
          onClose={() => setFileToRename(undefined)}
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
