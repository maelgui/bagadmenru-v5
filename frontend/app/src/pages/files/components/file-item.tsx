import { type LucideIcon, Download, EllipsisVertical, File, FileImage, FileMusic, FileText, Folder, Pencil, Trash2 } from 'lucide-react';
import { type FileOrFolder, FileOrFolderType } from 'bagad-client';
import { createElement, type MouseEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { LongPressEventType, useLongPress } from 'use-long-press';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';

interface FileItemProps {
  file: FileOrFolder
  big?: boolean
  deleteFn?: () => void
  renameFn?: () => void
  noAction?: boolean
  variant?: 'default' | 'outline' | 'muted'
}

const fileIconTypes = new Map<string, LucideIcon>([
  ['mp3', FileMusic],
  ['pdf', FileText],
  ['png', FileImage],
  ['jpg', FileImage],
  ['jpeg', FileImage],
]);

function getIcon(file: FileOrFolder): LucideIcon {
  if (file.type === FileOrFolderType.Dir) {
    return Folder;
  }
  const extension = file.name.toLowerCase().split('.').pop();
  return extension ? (fileIconTypes.get(extension) ?? File) : File;
}

function folderCountLabel(count: number): string {
  if (count === 0) return 'Vide';
  return `${count} élément${count > 1 ? 's' : ''}`;
}

function FolderCount({ file }: { file: FileOrFolder }) {
  if (file.type !== FileOrFolderType.Dir || file.childCount == null) {
    return null;
  }
  return <ItemDescription>{folderCountLabel(file.childCount)}</ItemDescription>;
}

function FileItemLink({
  file, bind,
}: {
  file: FileOrFolder;
  bind: ReturnType<typeof useLongPress>;
}) {
  const commonProps = {
    className: 'after:absolute after:inset-0',
    onContextMenu: (event: MouseEvent) => event.preventDefault(),
    ...bind(),
  };
  if (file.type === FileOrFolderType.File && file.fileUrl) {
    return (
      <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" {...commonProps}>
        {file.name}
      </a>
    );
  }
  return (
    <Link to={`/files/${file.id}`} {...commonProps}>
      {file.name}
    </Link>
  );
}

export default function FileItem({
  file, big = false, deleteFn = undefined, renameFn = undefined, noAction = false, variant = 'outline',
}: FileItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const bind = useLongPress(() => setIsOpen(true), { detect: LongPressEventType.Touch });
  const icon = createElement(getIcon(file), { 'aria-hidden': true });
  const isFile = file.type === FileOrFolderType.File;

  // Each action only renders when its capability is actually available: the
  // caller passes renameFn/deleteFn only when the user holds the matching
  // permission (edit:file / delete:file). With no action at all, the whole
  // menu trigger disappears.
  const showDownload = isFile && !!file.downloadUrl;
  const hasActions = !noAction && (showDownload || renameFn !== undefined || deleteFn !== undefined);

  return (
    <Item variant={variant} className="relative transition-colors hover:bg-muted">
      {big ? (
        <ItemHeader className="justify-center py-4 [&_svg]:size-16">
          {icon}
        </ItemHeader>
      ) : (
        <ItemMedia variant="icon">{icon}</ItemMedia>
      )}
      <ItemContent>
        <ItemTitle>
          <FileItemLink file={file} bind={bind} />
        </ItemTitle>
        <FolderCount file={file} />
      </ItemContent>
      {hasActions ? (
        <ItemActions>
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger
              render={<Button type="button" variant="ghost" size="icon-xs" className="relative shrink-0" aria-label={`Actions pour ${file.name}`} />}
            >
              <EllipsisVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {showDownload || renameFn ? (
                <DropdownMenuGroup>
                  {showDownload ? (
                    <DropdownMenuItem
                      render={(
                        <a
                          href={file.downloadUrl ?? undefined}
                          download={file.name}
                          rel="noopener noreferrer"
                        />
                      )}
                    >
                      <Download />
                      Télécharger
                    </DropdownMenuItem>
                  ) : null}
                  {renameFn ? (
                    <DropdownMenuItem onClick={renameFn}>
                      <Pencil />
                      Renommer...
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuGroup>
              ) : null}
              {(showDownload || renameFn) && deleteFn ? <DropdownMenuSeparator /> : null}
              {deleteFn ? (
                <DropdownMenuGroup>
                  <DropdownMenuItem variant="destructive" onClick={deleteFn}>
                    <Trash2 />
                    Supprimer...
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </ItemActions>
      ) : null}
    </Item>
  );
}

export function FileItemSkeleton({ big = false, variant = 'outline' }: { big?: boolean; variant?: 'default' | 'outline' | 'muted' }) {
  return (
    <Item variant={variant}>
      {big ? (
        <ItemHeader className="justify-center py-4">
          <Skeleton className="size-16" />
        </ItemHeader>
      ) : (
        <ItemMedia variant="icon"><Skeleton className="size-6" /></ItemMedia>
      )}
      <ItemContent>
        <Skeleton className="h-4 w-48" />
      </ItemContent>
    </Item>
  );
}
