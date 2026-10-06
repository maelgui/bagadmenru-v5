import { type LucideIcon, Download, EllipsisVertical, File, FileArchive, FileAudio, FileImage, FileMusic, FileText, FileVideo, Folder, FolderArchive, Pencil, Trash2 } from 'lucide-react';
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

interface FileAspect {
  icon: LucideIcon
  color: string
}

const folderAspect: FileAspect = { icon: Folder, color: 'text-primary' };
const containerAspect: FileAspect = { icon: FolderArchive, color: 'text-primary' };
const defaultAspect: FileAspect = { icon: File, color: 'text-muted-foreground' };

const scoreAspect: FileAspect = { icon: FileMusic, color: 'text-file-score' };
const documentAspect: FileAspect = { icon: FileText, color: 'text-file-document' };
const imageAspect: FileAspect = { icon: FileImage, color: 'text-file-image' };
const audioAspect: FileAspect = { icon: FileAudio, color: 'text-file-audio' };
const videoAspect: FileAspect = { icon: FileVideo, color: 'text-file-video' };
const archiveAspect: FileAspect = { icon: FileArchive, color: 'text-file-archive' };

const fileAspectByExtension = new Map<string, FileAspect>([
  ['mscz', scoreAspect],
  ['ds', scoreAspect],
  ['pdf', documentAspect],
  ['png', imageAspect],
  ['jpg', imageAspect],
  ['jpeg', imageAspect],
  ['gif', imageAspect],
  ['webp', imageAspect],
  ['heic', imageAspect],
  ['mp3', audioAspect],
  ['wav', audioAspect],
  ['m4a', audioAspect],
  ['ogg', audioAspect],
  ['flac', audioAspect],
  ['mp4', videoAspect],
  ['mov', videoAspect],
  ['webm', videoAspect],
  ['zip', archiveAspect],
  ['rar', archiveAspect],
  ['7z', archiveAspect],
]);

function getAspect(file: FileOrFolder): FileAspect {
  if (file.type === FileOrFolderType.Dir) {
    return folderAspect;
  }
  if (file.type === FileOrFolderType.Container) {
    return containerAspect;
  }
  const extension = file.name.toLowerCase().split('.').pop();
  return extension ? (fileAspectByExtension.get(extension) ?? defaultAspect) : defaultAspect;
}

function folderCountLabel(count: number): string {
  if (count === 0) return 'Vide';
  return `${count} élément${count > 1 ? 's' : ''}`;
}

const processingLabels = new Map<string, string>([
  ['pending', 'Conversion en attente'],
  ['processing', 'Conversion en cours'],
  ['failed', 'Échec de la conversion'],
]);

function FolderCount({ file }: { file: FileOrFolder }) {
  if (file.type === FileOrFolderType.Container) {
    const status = file.processingStatus ?? undefined;
    if (status && status !== 'completed') {
      return <ItemDescription>{processingLabels.get(status) ?? status}</ItemDescription>;
    }
    if (file.childCount != null) {
      return <ItemDescription>{folderCountLabel(file.childCount)}</ItemDescription>;
    }
    return null;
  }
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
  const aspect = getAspect(file);
  const icon = createElement(aspect.icon, { 'aria-hidden': true, className: aspect.color });
  const isFile = file.type === FileOrFolderType.File;
  const isContainer = file.type === FileOrFolderType.Container;

  const showDownload = (isFile || isContainer) && !!file.downloadUrl;
  const downloadLabel = isContainer ? 'Télécharger la source' : 'Télécharger';
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
                      {downloadLabel}
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
