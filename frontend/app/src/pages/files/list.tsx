import { faFile, faFolder } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileOrFolderType } from 'bagad-client';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/button';
import Header from '../../components/header';
import { filesApi, queryClient } from '../../config/client';

export default function ListFilesPage() {
  const params = useParams();
  const { data: folder } = useQuery({
    queryKey: ['files', params.folderId ?? 'root'],
    queryFn: async ({ queryKey }) => (
      queryKey[1] === 'root'
        ? filesApi.getRootApiV1FilesGet()
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
    // The query will not execute until the userId exists
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

  const downloadMutation = useMutation({
    mutationFn: (fileId: number) => filesApi.downloadFileApiV1FilesFileIdDownloadGet({ fileId }),
    onSuccess(url) {
      window.open(url, '_blank');
    },
  });

  if (!folder?.id) {
    return null;
  }

  return (
    <div>
      <Header
        title="Fichiers"
        subtitle={folder?.name}
        actions={[
          <Button as="label" htmlFor="upload-file" key="upload-file" outline>
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
      <div className="grid grid-cols-4 gap-4">
        {children?.map((file) => (
          file.type === FileOrFolderType.Dir ? (
            <Link to={`/files/${file.id}`} key={file.id} className="truncate py-3 px-4 border rounded border-gray-200 hover:bg-gray-50">
              <FontAwesomeIcon icon={faFolder} className="mr-4" />
              {file.name}
            </Link>

          ) : (
            <button type="button" onClick={() => downloadMutation.mutate(file.id)} key={file.id} className="text-left truncate py-3 px-4 border rounded border-gray-200 hover:bg-gray-50">
              <FontAwesomeIcon icon={faFile} className="mr-4" />
              {file.name}
            </button>

          )
        ))}

      </div>
    </div>
  );
}
