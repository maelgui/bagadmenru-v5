import {
  type LucideIcon, File, FileArchive, FileAudio, FileImage, FileMusic, FileText, FileVideo, Folder, FolderArchive,
} from 'lucide-react';
import { type FileOrFolder, FileOrFolderType } from 'bagad-client';

export interface FileAspect {
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

export function fileAspect(file: Pick<FileOrFolder, 'type' | 'name'>): FileAspect {
  if (file.type === FileOrFolderType.Dir) {
    return folderAspect;
  }
  if (file.type === FileOrFolderType.Container) {
    return containerAspect;
  }
  const extension = file.name.toLowerCase().split('.').pop();
  return extension ? (fileAspectByExtension.get(extension) ?? defaultAspect) : defaultAspect;
}
