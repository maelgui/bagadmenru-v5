import {
  faCloudArrowUp, faExclamationTriangle, faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import { type FileOrFolder, FileOrFolderType } from 'bagad-client';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import Alert from '../../components/alert';
import Button from '../../components/button';
import Container from '../../components/container';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogHeading,
} from '../../components/dialog';
import Header from '../../components/header';
import Input from '../../components/input';
import { SkeletonText } from '../../components/skeleton';
import { queryClient, useApiClient, usePermissions } from '../../config/client';
import FileItem, { FileItemSkeleton } from './components/file-item';

export default function ListFilesPage() {
  const { filesApi } = useApiClient();
  const { can } = usePermissions();

  const params = useParams();
  const { data: folder } = useQuery({
    queryKey: ['files', params.folderId ?? 'root'],
    queryFn: async ({ queryKey }) => (
      queryKey[1] === 'root'
        ? await filesApi.getRootApiV1FilesRootGet()
        : await filesApi.getFileApiV1FilesFileIdGet({ fileId: parseInt(queryKey[1], 10) })
    ),
  });

  const {
    data: children, status,
  } = useQuery({
    queryKey: ['files', 'children', folder?.id],
    queryFn: async () => {
      if (!folder?.id) {
        throw new Error('Invalid id');
      }
      return await filesApi.listChildrenApiV1FilesFolderIdChildrenGet({ folderId: folder.id });
    },
    select: (data) => ({
      folders: data.filter((value) => value.type === FileOrFolderType.Dir),
      files: data.filter((value) => value.type === FileOrFolderType.File),
    }),
    // The query will not execute until the folder id exists
    enabled: !!folder?.id,
  });

  const {
    data: breadcrumb,
  } = useQuery({
    queryKey: ['files', 'breadcrumb', folder?.id],
    queryFn: async () => {
      if (!folder?.id) {
        throw new Error('Invalid id');
      }
      return await filesApi.getBreadcrumbApiV1FilesFileIdBreadcrumbGet({ fileId: folder.id });
    },
    // The query will not execute until the folder id exists
    enabled: !!folder?.id,
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!folder?.id) {
        return await Promise.reject(new Error('Unable to upload'));
      }
      return await filesApi.createFolderApiV1FilesFolderIdPost({
        folderId: folder.id,
        folderCreate: { name },
      });
    },
    onSettled: async () => await queryClient.invalidateQueries({ queryKey: ['files', 'children', folder?.id ?? 'root'] }),
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (acceptedFiles: File[]) => {
      if (!folder?.id) {
        return await Promise.reject(new Error('Unable to upload'));
      }
      return await Promise.all(Array.from(acceptedFiles).map(async (file) => (
        await filesApi.uploadFileApiV1FilesFolderIdUploadPost({
          folderId: folder.id,
          file,
        })
      )));
    },
    onSettled: async () => await queryClient.invalidateQueries({ queryKey: ['files', 'children', folder?.id ?? 'root'] }),
    onSuccess: (data) => toast.success(`${data.length} fichier(s) envoyé(s) avec succès.`),
  });

  const [fileToDelete, setFileToDelete] = useState<FileOrFolder | undefined>(undefined);
  const [fileToRename, setFileToRename] = useState<FileOrFolder | undefined>(undefined);
  const [newFileName, setNewFileName] = useState('');

  const confirmDeleteFile = (file: FileOrFolder) => {
    setFileToDelete(file);
  };

  const confirmRenameFile = (file: FileOrFolder) => {
    setFileToRename(file);
    setNewFileName(file.name);
  };

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => await filesApi.deleteFileApiV1FilesFileIdDelete({ fileId }),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['files', 'children', folder?.id ?? 'root'] });
      setFileToDelete(undefined);
    },
  });

  const renameFileMutation = useMutation({

    mutationFn: async ({ fileId, name }: { fileId: number; name: string }) => await filesApi.updateFileApiV1FilesFileIdPut({
      fileId,
      fileOrFolderUpdate: { name, parentId: folder?.id ?? 0 },
    }),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['files', 'children', folder?.id ?? 'root'] });
      setFileToRename(undefined);
      setNewFileName('');
    },
  });

  const {
    getRootProps, getInputProps, isDragActive,
  } = useDropzone({
    onDrop: (acceptedFiles) => uploadFileMutation.mutate(acceptedFiles),
    noClick: true,
    noKeyboard: true,
  });

  return (
    <>
      <Header
        title="Fichiers"
        subtitle={folder?.name ?? <SkeletonText className="w-32" />}
        breadcrumb={params.folderId ? [
          { title: 'Fichiers', link: '/files' },
          ...(breadcrumb?.slice(1, -1).map((item) => ({ title: item.name, link: `/files/${item.id}` })) ?? []),
          ...(breadcrumb?.slice(-1).map((item) => ({ title: item.name })) ?? []),
        ] : [{ title: 'Fichiers' }]}
        actions={can('create', 'file')
          ? [
            <Header.Action as="label" key="upload-file" variant="outline">
              Ajouter un fichier
              { }
              <input {...getInputProps()} />
            </Header.Action>,
            <Header.Action
              key="add-folder"
              type="button"
              onClick={() => {

                const name = prompt('Nom du dossier');
                if (name) {
                  createFolderMutation.mutate(name);
                }
              }}
            >
              Créer un dossier
            </Header.Action>,
          ] : []}
      />
      <Container>
        {status === 'pending' ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FileItemSkeleton />
              <FileItemSkeleton />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
              <FileItemSkeleton big />
            </div>
          </>
        ) : null}
        {status === 'error' ? <Alert type="error">Erreur</Alert> : null}
        {status === 'success' ? (

          <div {...getRootProps({ className: 'relative' })}>
            <div className={isDragActive ? 'border-2 border-pourpre-500 block absolute w-full h-full bg-pourpre-50/50 z-10 rounded-lg' : ''} />
            {!children.files.length && !children.folders.length ? (
              <Alert type="info">Dossier vide</Alert>
            ) : null}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {children.folders.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  deleteFn={() => confirmDeleteFile(file)}
                  renameFn={() => confirmRenameFile(file)}
                />
              ))}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
              {children.files.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  big
                  deleteFn={() => confirmDeleteFile(file)}
                  renameFn={() => confirmRenameFile(file)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </Container>
      <Dialog open={fileToDelete !== undefined} onOpenChange={() => setFileToDelete(undefined)}>
        <DialogContent>
          <DialogHeading>
            <div className="inline-flex mx-auto mb-4 h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
              <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-red-600" />
            </div>
            <h2>Supprimer un fichier</h2>
          </DialogHeading>
          <DialogDescription>
            <p>
              Vous vous apprêtez à supprimer le fichier
              {' '}
              <b>{fileToDelete?.name}</b>
              .
              Êtes-vous sûr de vouloir supprimer ce fichier ?
            </p>
            <div className="flex gap-4 mt-8 mb-2">
              <Button
                className="w-full m-0"
                variant="outline"
                onClick={() => setFileToDelete(undefined)}
              >
                Annuler
              </Button>
              <Button
                className="w-full m-0"
                disabled={fileToDelete === undefined || deleteFileMutation.status === 'pending'}
                onClick={() => {
                  if (fileToDelete !== undefined) deleteFileMutation.mutate(fileToDelete.id);
                }}
              >
                <FontAwesomeIcon icon={faTrashAlt} className={`w-4 mr-2 ${deleteFileMutation.status === 'pending' ? 'animate-spin' : ''}`} />
                Supprimer
              </Button>
            </div>
          </DialogDescription>
          <DialogClose />
        </DialogContent>
      </Dialog>
      <Dialog open={fileToRename !== undefined} onOpenChange={() => setFileToRename(undefined)}>
        <DialogContent>
          <DialogHeading>
            <h2>Renommer</h2>
          </DialogHeading>
          <DialogDescription>
            <label htmlFor="name" className="mb-2 block font-semibold">Nouveau nom</label>
            <Input
              id="name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && fileToRename && newFileName.trim()) {
                  renameFileMutation.mutate({ fileId: fileToRename.id, name: newFileName.trim() });
                }
              }}
            />
            <div className="flex gap-4 mt-8 mb-2">
              <Button
                className="w-full m-0"
                variant="outline"
                onClick={() => setFileToRename(undefined)}
              >
                Annuler
              </Button>
              <Button
                className="w-full m-0"
                disabled={!newFileName.trim() || renameFileMutation.status === 'pending'}
                onClick={() => {
                  if (fileToRename && newFileName.trim()) {

                    renameFileMutation.mutate({ fileId: fileToRename.id, name: newFileName.trim() });
                  }
                }}
              >
                Renommer
              </Button>
            </div>
          </DialogDescription>
          <DialogClose />
        </DialogContent>
      </Dialog>
      <Dialog open={uploadFileMutation.status === 'pending'}>
        <DialogContent>
          <DialogHeading>
            <div className="animate-bounce inline-flex mx-auto mb-4 h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-sky-100">
              <FontAwesomeIcon icon={faCloudArrowUp} className="h-5 w-5 text-sky-600" />
            </div>
            <h2>Envoie des fichiers...</h2>
          </DialogHeading>
        </DialogContent>
      </Dialog>
    </>
  );
}
