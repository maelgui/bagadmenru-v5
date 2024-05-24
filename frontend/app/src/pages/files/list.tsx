import {
  faCloudArrowUp, faExclamationTriangle, faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileOrFolder, FileOrFolderType } from 'bagad-client';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import Alert from '../../components/alert';
import Button from '../../components/button';
import Container from '../../components/container';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogHeading,
} from '../../components/dialog';
import Header from '../../components/header';
import { SkeletonText } from '../../components/skeleton';
import { queryClient, useApiClient } from '../../config/client';
import FileItem, { FileItemSkeleton } from './components/file-item';

export default function ListFilesPage() {
  const { filesApi } = useApiClient();

  const params = useParams();
  const { data: folder } = useQuery({
    queryKey: ['files', params.folderId ?? 'root'],
    queryFn: async ({ queryKey }) => (
      queryKey[1] === 'root'
        ? filesApi.getRootApiV1FilesRootGet()
        : filesApi.getFileApiV1FilesFileIdGet({ fileId: parseInt(queryKey[1], 10) })
    ),
  });

  const {
    data: children, status,
  } = useQuery({
    queryKey: ['files', 'children', folder?.id],
    queryFn: async ({ queryKey }) => (
      typeof queryKey[2] !== 'number'
        ? Promise.reject(new Error('Invalid id'))
        : filesApi.listChildrenApiV1FilesFolderIdChildrenGet({ folderId: queryKey[2] })
    ),
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
    queryFn: async ({ queryKey }) => (
      typeof queryKey[2] !== 'number'
        ? Promise.reject(new Error('Invalid id'))
        : filesApi.getBreadcrumbApiV1FilesFileIdBreadcrumbGet({ fileId: queryKey[2] })
    ),
    // The query will not execute until the folder id exists
    enabled: !!folder?.id,
  });

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => {
      if (!folder?.id) {
        return Promise.reject(new Error('Unable to upload'));
      }
      return filesApi.createFolderApiV1FilesFolderIdPost({
        folderId: folder?.id,
        folderCreate: { name },
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['files', 'children', folder?.id ?? 'root'] }),
  });

  const uploadFileMutation = useMutation({
    mutationFn: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!folder?.id) {
        return Promise.reject(new Error('Unable to upload'));
      }
      return Promise.all(Array.from(e.target.files ?? [])?.map((file) => (
        filesApi.uploadFileApiV1FilesFolderIdUploadPost({
          folderId: folder?.id,
          file,
        })
      )));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['files', 'children', folder?.id ?? 'root'] }),
    onSuccess: (data) => toast.success(`${data.length} fichier(s) envoyé(s) avec succès.`),
  });

  const [fileToDelete, setFileToDelete] = useState<FileOrFolder | undefined>(undefined);
  const confirmDeleteFile = (file: FileOrFolder) => {
    setFileToDelete(file);
  };

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: number) => filesApi.deleteFileApiV1FilesFileIdDelete({ fileId }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['files', 'children', folder?.id ?? 'root'] });
      setFileToDelete(undefined);
    },
  });

  return (
    <>
      <Header
        title="Fichiers"
        subtitle={folder?.name ? folder.name : <SkeletonText className="w-32" />}
        breadcrumb={params.folderId ? [
          { title: 'Fichiers', link: '/files' },
          ...(breadcrumb?.slice(1, -1).map((item) => ({ title: item.name, link: `/files/${item.id}` })) ?? []),
          ...(breadcrumb?.slice(-1).map((item) => ({ title: item.name })) ?? []),
        ] : [{ title: 'Fichiers' }]}
        actions={[
          <Header.Action as="label" key="upload-file" variant="outline">
            Ajouter un fichier
            <input key="upload-file" type="file" id="upload-file" className="hidden" multiple onChange={uploadFileMutation.mutate} />
          </Header.Action>,
          <Header.Action
            key="add-folder"
            type="button"
            onClick={async () => {
              /* eslint-disable no-alert */
              const name = prompt('nom du dossier', 'nom de sdosisr');
              if (name) {
                createFolderMutation.mutate(name);
              }
            }}
          >
            Créer un dossier
          </Header.Action>,
        ]}
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
          <>
            {children && !children?.files.length && !children?.folders.length ? (
              <Alert type="info">Dossier vide</Alert>
            ) : null}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {children?.folders.map((file) => (
                <FileItem key={file.id} file={file} deleteFn={() => confirmDeleteFile(file)} />
              ))}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
              {children?.files.map((file) => (
                <FileItem key={file.id} file={file} big deleteFn={() => confirmDeleteFile(file)} />
              ))}
            </div>
          </>
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
                  if (fileToDelete !== undefined) deleteFileMutation.mutate(fileToDelete?.id);
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
