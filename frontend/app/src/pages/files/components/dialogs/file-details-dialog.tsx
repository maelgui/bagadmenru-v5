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

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
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
        <dl className="grid gap-4">
          <DetailRow label="Type">
            {file ? (typeLabels.get(file.type) ?? 'Fichier') : null}
          </DetailRow>
          <DetailRow label="Date d'ajout">
            {file?.uploadedAt ? formatDateTime(file.uploadedAt) : 'Inconnue'}
          </DetailRow>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
