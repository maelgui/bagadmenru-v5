import { type LucideIcon, EllipsisVertical, File, FileImage, FileMusic, FileText, Folder, Pencil, Trash2 } from 'lucide-react';
import { type FileOrFolder, FileOrFolderType } from 'bagad-client';
import { createElement, useState } from 'react';
import { Link } from 'react-router-dom';
import { LongPressEventType, useLongPress } from 'use-long-press';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Item,
  ItemActions,
  ItemContent,
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

export default function FileItem({
  file, big = false, deleteFn = undefined, renameFn = undefined, noAction = false, variant = 'outline',
}: FileItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const bind = useLongPress(() => setIsOpen(true), { detect: LongPressEventType.Touch });
  const icon = createElement(getIcon(file), { 'aria-hidden': true });

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
          <Link
            to={file.fileUrl ?? `/files/${file.id}`}
            className="after:absolute after:inset-0"
            {...bind()}
            onContextMenu={(event) => event.preventDefault()}
          >
            {file.name}
          </Link>
        </ItemTitle>
      </ItemContent>
      {!noAction ? (
        <ItemActions>
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger
              render={<Button type="button" variant="ghost" size="icon-xs" className="relative shrink-0" aria-label={`Actions pour ${file.name}`} />}
            >
              <EllipsisVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={renameFn}>
                  <Pencil />
                  Renommer...
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={deleteFn}>
                  <Trash2 />
                  Supprimer...
                </DropdownMenuItem>
              </DropdownMenuGroup>
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
