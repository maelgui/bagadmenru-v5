import { useMutation, useQuery } from '@tanstack/react-query';
import { FileOrFolderType } from 'bagad-client';
import React from 'react';
import { useParams } from 'react-router-dom';
import Alert from '../../components/alert';
import Button from '../../components/button';
import Container from '../../components/container';
import ErrorComponent from '../../components/error';
import Header from '../../components/header';
import { filesApi, queryClient } from '../../config/client';
import FileItem from './components/file-item';
import FolderItem from './components/folder-item';

export default function ListFilesPage() {
  const params = useParams();
  const { data: folder, error, status } = useQuery({
    queryKey: ['files', params.folderId ?? 'root'],
    queryFn: async ({ queryKey }) => (
      queryKey[1] === 'root'
        ? filesApi.getRootApiV1FilesRootGet()
        : filesApi.getFileApiV1FilesFileIdGet({ fileId: parseInt(queryKey[1], 10) })
    ),
  });

  const {
    data: children,
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
  });

  if (status === 'error') {
    return <ErrorComponent error={error?.message} />;
  }
  if (status === 'pending') {
    return <div>Loading</div>;
  }

  return (
    <>
      <Header
        title="Fichiers"
        subtitle={params.folderId ? folder.name : undefined}
        breadcrumb={params.folderId ? [
          { title: 'Fichiers', link: '/files' },
          ...(breadcrumb?.slice(1, -1).map((item) => ({ title: item.name, link: `/files/${item.id}` })) ?? []),
          ...(breadcrumb?.slice(-1).map((item) => ({ title: item.name })) ?? []),
        ] : [{ title: 'Fichiers' }]}
        actions={[
          <Button key="upload-file" variant="outline">
            Ajouter un fichier
            <input key="upload-file" type="file" id="upload-file" className="hidden" multiple onChange={uploadFileMutation.mutate} />
          </Button>,
          <Button
            key="add-folder"
            type="button"
            onClick={async () => {
              const name = prompt('nom du dossier', 'nom de sdosisr') ?? 'bla';
              createFolderMutation.mutate(name);
            }}
          >
            Créer un dossier
          </Button>,
        ]}
      />
      <Container>
        {children && !children?.files.length && !children?.folders.length ? (
          <Alert type="info">Dossier vide</Alert>
        ) : null}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {children?.folders.map((file) => (
            <FolderItem key={file.id} folder={file} />
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
          {children?.files.map((file) => (
            <FileItem key={file.id} file={file} />
          ))}
        </div>
      </Container>
    </>
  );
}
