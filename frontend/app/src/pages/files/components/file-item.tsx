/* eslint-disable react/jsx-props-no-spreading */
import {
  FloatingFocusManager,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { faFolder } from '@fortawesome/free-regular-svg-icons';
import {
  IconDefinition,
  faEllipsisVertical, faFile, faFilePdf, faFolderTree, faImage, faMusic, faPencil, faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FileOrFolder } from 'bagad-client';
import { MouseEventHandler, useState } from 'react';
import { Link } from 'react-router-dom';
import { LongPressEventType, useLongPress } from 'use-long-press';
import Button from '../../../components/button';

interface FileItemProps {
  file: FileOrFolder
  big?: boolean
  deleteFn?: MouseEventHandler<HTMLButtonElement>
}

export default function FileItem({ file, big = false, deleteFn = undefined }: FileItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const bind = useLongPress(() => {
    setIsOpen(true);
  }, { detect: LongPressEventType.Touch });

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate,
    middleware: [offset(5), flip(), shift()],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  // Merge all the interactions into prop getters
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const faFileIconType: Record<string, IconDefinition> = {
    mp3: faMusic,
    pdf: faFilePdf,
    png: faImage,
    jpg: faImage,
    document: faFile,
  };

  return (
    <>
      <div className="relative border rounded border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm">
        {big && (
          <div className="p-4 text-center h-32 [&>svg]:max-h-16 flex justify-center items-center border-b border-gray-50">
            <FontAwesomeIcon size="3x" icon={file.type === 'DIR' ? faFolder : faFileIconType[file.name.toLowerCase().split('.').pop() ?? 'document']} className="mr-4" />
          </div>
        )}
        <div className="flex justify-between p-4 items-center">
          <div className="truncate">
            {!big && <FontAwesomeIcon icon={file.type === 'DIR' ? faFolder : faFileIconType[file.name.toLowerCase().split('.').pop() ?? 'document']} className="mr-4" />}
            <Link
              to={file.fileUrl ?? `/files/${file.id}`}
              className="truncate after:absolute after:top-0 after:bottom-0 after:left-0 after:right-0"
              {...bind()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {file.name}
            </Link>
          </div>
          <button
            type="button"
            data-dropdown-toggle={`dropdown-file-action-${file.id}`}
            className="relative shrink-0 w-6 h-6 rounded hover:bg-gray-200 text-center"
            ref={refs.setReference}
            {...getReferenceProps()}
          >
            <FontAwesomeIcon icon={faEllipsisVertical} />
          </button>
        </div>
      </div>

      {isOpen && (
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={refs.setFloating}
            className="flex flex-col p-1 rounded border bg-white shadow z-10"
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <Button variant="ghost" className="text-left capitalize font-medium">
              <FontAwesomeIcon icon={faPencil} className="mr-3 w-4" />
              {' '}
              Renomer...
            </Button>
            <Button variant="ghost" className="text-left capitalize font-medium">
              <FontAwesomeIcon icon={faFolderTree} className="mr-3 w-4" />
              {' '}
              Déplacer...
            </Button>
            <hr className="mx-2 my-1" />
            <Button variant="ghost" className="text-left text-red-600 capitalize font-medium" onClick={deleteFn}>
              <FontAwesomeIcon icon={faTrashCan} className="mr-3 w-4" />
              {' '}
              Supprimer...
            </Button>
          </div>
        </FloatingFocusManager>
      )}
    </>
  );
}
