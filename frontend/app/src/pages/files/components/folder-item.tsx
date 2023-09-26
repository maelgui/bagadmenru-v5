import { faEllipsisVertical, faFolder } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FileOrFolder } from 'bagad-client';
import { Link } from 'react-router-dom';

export default function FolderItem({ folder }: { folder: FileOrFolder }) {
  return (
    <div className="relative p-4 flex justify-between items-center border-2 border-gray-200 hover:bg-gray-50 ">
      <span className="truncate">
        <FontAwesomeIcon icon={faFolder} className="mr-4" />
        <Link to={`/files/${folder.id}`} className="after:absolute after:top-0 after:bottom-0 after:left-0 after:right-0">
          {folder.name}
        </Link>
      </span>
      <button type="button" className="shrink-0 relative w-6 h-6 rounded hover:bg-gray-200 text-center">
        <FontAwesomeIcon icon={faEllipsisVertical} />
      </button>
    </div>
  );
}
