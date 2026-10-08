import type { ReactNode } from 'react';
import { type FileOrFolder, FileOrFolderType } from 'bagad-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const typeLabels = new Map<FileOrFolderType, string>([
  [FileOrFolderType.Dir, 'Dossier'],
  [FileOrFolderType.Container, 'Conteneur'],
  [FileOrFolderType.File, 'Fichier'],
]);

const BYTES_PER_UNIT = 1024;
const SIZE_UNITS = ['Ko', 'Mo', 'Go', 'To'];
const ONE_DECIMAL_BELOW = 10;

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatSize(bytes: number): string {
  if (bytes < BYTES_PER_UNIT) return `${bytes} o`;
  let value = bytes / BYTES_PER_UNIT;
  let unit = 0;
  while (value >= BYTES_PER_UNIT && unit < SIZE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unit += 1;
  }
  return `${value.toFixed(value < ONE_DECIMAL_BELOW ? 1 : 0)} ${SIZE_UNITS[unit]}`;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function FileDetailsBody({ file }: { file: FileOrFolder }) {
  const hasContent = file.type === FileOrFolderType.File || file.type === FileOrFolderType.Container;
  return (
    <dl className="grid gap-4">
      <DetailRow label="Type">{typeLabels.get(file.type) ?? 'Fichier'}</DetailRow>
      {hasContent && file.size != null ? (
        <DetailRow label="Taille">{formatSize(file.size)}</DetailRow>
      ) : null}
      <DetailRow label="Ajouté">
        {file.uploadedAt ? formatDateTime(file.uploadedAt) : 'Date inconnue'}
        {file.uploader ? ` par ${file.uploader.name}` : null}
      </DetailRow>
      {file.modifiedAt ? (
        <DetailRow label="Modifié">
          {formatDateTime(file.modifiedAt)}
          {file.modifier ? ` par ${file.modifier.name}` : null}
        </DetailRow>
      ) : null}
    </dl>
  );
}

export default function FileDetailsDialog({
  file, onClose,
}: {
  file?: FileOrFolder;
  onClose: () => void;
}) {
  return (
    <Dialog open={file !== undefined} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="break-all">{file?.name}</DialogTitle>
          <DialogDescription>Détails</DialogDescription>
        </DialogHeader>
        {file ? <FileDetailsBody file={file} /> : null}
      </DialogContent>
    </Dialog>
  );
}
