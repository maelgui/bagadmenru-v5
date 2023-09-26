import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation } from '@tanstack/react-query';
import { FileOrFolder } from 'bagad-client';
import { FileIcon } from 'react-file-icon';
import { filesApi } from '../../../config/client';

export default function FileItem({ file }: { file: FileOrFolder }) {
  const downloadMutation = useMutation({
    mutationFn: (fileId: number) => filesApi.downloadFileApiV1FilesFileIdDownloadGet({ fileId }),
    onSuccess(url) {
      window.open(url, '_blank');
    },
  });

  return (
    <>
      <div className="relative border border-gray-200 hover:bg-gray-50 shadow-sm">
        <div className="p-4 text-center h-32 [&>svg]:max-h-16 flex justify-center items-center border-b border-gray-50">
          <FileIcon extension={file.name.split('.')[-1]} color="#15141A" />
        </div>
        <div className="flex justify-between p-4 ">
          <button
            type="button"
            onClick={() => downloadMutation.mutate(file.id)}
            key={file.id}
            className="truncate after:absolute after:top-0 after:bottom-0 after:left-0 after:right-0"
          >
            {file.name}
          </button>
          <button type="button" data-dropdown-toggle={`dropdown-file-action-${file.id}`} className="relative shrink-0 w-6 h-6 rounded hover:bg-gray-200 text-center">
            <FontAwesomeIcon icon={faEllipsisVertical} />
          </button>
        </div>
      </div>

      <div id={`dropdown-file-action-${file.id}`} className="z-10 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700 dark:divide-gray-600">
        <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownMenuIconButton">
          <li>
            <a href="#" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Dashboard</a>
          </li>
          <li>
            <a href="#" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Settings</a>
          </li>
          <li>
            <a href="#" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Earnings</a>
          </li>
        </ul>
        <div className="py-2">
          <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white">Separated link</a>
        </div>
      </div>
    </>

  );
}
