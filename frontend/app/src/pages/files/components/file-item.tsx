import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FileOrFolder } from 'bagad-client';
import { FileIcon } from 'react-file-icon';

export default function FileItem({ file }: { file: FileOrFolder }) {
  return (
    <>
      <div className="relative border border-gray-200 hover:bg-gray-50 shadow-sm">
        <div className="p-4 text-center h-32 [&>svg]:max-h-16 flex justify-center items-center border-b border-gray-50">
          <FileIcon extension={file.name.split('.')[-1]} color="#15141A" />
        </div>
        <div className="flex justify-between p-4 ">
          <button
            type="button"
            onClick={() => window.open(file.fileUrl!, '_blank')}
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
            <button type="button" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Dashboard</button>
          </li>
          <li>
            <button type="button" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Settings</button>
          </li>
          <li>
            <button type="button" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Earnings</button>
          </li>
        </ul>
        <div className="py-2">
          <button type="button" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white">Separated link</button>
        </div>
      </div>
    </>

  );
}
