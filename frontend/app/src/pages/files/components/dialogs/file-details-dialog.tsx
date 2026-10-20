import type { ReactNode } from 'react';
import { Download } from 'lucide-react';
import { type FileOrFolder, FileOrFolderType, type FileVersion } from 'bagad-client';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fileVersionDownloadUrl } from '../../file-urls';

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

function VersionRow({ fileId, version }: { fileId: number; version: FileVersion }) {
  const meta = [
    formatDateTime(version.uploadedAt),
    version.uploader?.name,
    version.size != null ? formatSize(version.size) : undefined,
  ].filter(Boolean).join(' · ');
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-medium">
          v{version.number}
          {version.supersededAt ? null : (
            <Badge className="bg-primary/15 text-primary">Actuelle</Badge>
          )}
        </span>
        <span className="text-muted-foreground text-xs">{meta}</span>
      </div>
      {version.purgedAt ? (
        <span className="text-muted-foreground text-xs">Expirée</span>
      ) : (
        <a
          href={fileVersionDownloadUrl(fileId, version.id)}
          rel="noopener noreferrer"
          aria-label={`Télécharger la version ${version.number}`}
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
        >
          <Download aria-hidden />
        </a>
      )}
    </li>
  );
}

function FileDetailsBody({ file, versions }: { file: FileOrFolder; versions?: FileVersion[] }) {
  const size = file.currentVersion?.size;
  return (
    <dl className="grid gap-4">
      <DetailRow label="Type">{typeLabels.get(file.type) ?? 'Fichier'}</DetailRow>
      {size != null ? <DetailRow label="Taille">{formatSize(size)}</DetailRow> : null}
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
      {versions && versions.length > 1 ? (
        <DetailRow label="Versions">
          <ul className="divide-y">
            {versions.map((version) => <VersionRow key={version.id} fileId={file.id} version={version} />)}
          </ul>
        </DetailRow>
      ) : null}
    </dl>
  );
}

export default function FileDetailsDialog({
  file, versions, onClose,
}: {
  file?: FileOrFolder;
  versions?: FileVersion[];
  onClose: () => void;
}) {
  return (
    <Dialog open={file !== undefined} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="break-all">{file?.name}</DialogTitle>
          <DialogDescription>Détails</DialogDescription>
        </DialogHeader>
        {file ? <FileDetailsBody file={file} versions={versions} /> : null}
      </DialogContent>
    </Dialog>
  );
}
