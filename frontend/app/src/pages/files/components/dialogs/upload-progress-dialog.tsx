import { Check, CloudUpload, FileX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import type { UploadItem } from '../../use-batch-upload';

const PERCENT = 100;

function StatusMedia({ status }: { status: UploadItem['status'] }) {
  switch (status) {
    case 'uploading':
      return <Spinner />;
    case 'done':
      return <Check className="size-4 text-primary" />;
    case 'error':
      return <X className="size-4 text-destructive" />;
    case 'skipped':
      return <FileX className="size-4 text-muted-foreground" />;
    case 'conflict':
      return <CloudUpload className="size-4 text-muted-foreground" />;
  }
}

function statusLabel(status: UploadItem['status']): string | null {
  switch (status) {
    case 'done':
      return 'Envoyé';
    case 'error':
      return 'Échec';
    case 'skipped':
      return 'Ignoré';
    default:
      return null;
  }
}

export default function UploadProgressDialog({
  open, items, onResolveConflict, onClose,
}: {
  open: boolean;
  items: UploadItem[];
  onResolveConflict: (id: string, overwrite: boolean) => void;
  onClose: () => void;
}) {
  const settled = items.every(
    (item) => item.status === 'done' || item.status === 'error' || item.status === 'skipped',
  );
  const hasConflict = items.some((item) => item.status === 'conflict');
  const processed = items.filter(
    (item) => item.status === 'done' || item.status === 'error' || item.status === 'skipped',
  ).length;
  const total = items.length;
  const percent = total === 0 ? 0 : Math.round((processed / total) * PERCENT);

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value && settled) onClose(); }}>
      <DialogContent showCloseButton={settled}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CloudUpload />Envoi des fichiers</DialogTitle>
          <DialogDescription>
            {hasConflict
              ? 'Certains fichiers existent déjà. Choisissez de les écraser ou de les ignorer.'
              : 'Progression de l\u2019envoi des fichiers.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{processed}/{total}</span>
        </div>
        <ItemGroup className="max-h-80 overflow-y-auto">
          {items.map((item) => (
            <Item key={item.id} variant="muted" size="sm">
              <ItemMedia variant="icon"><StatusMedia status={item.status} /></ItemMedia>
              <ItemContent>
                <ItemTitle>{item.file.name}</ItemTitle>
              </ItemContent>
              <ItemActions>
                {item.status === 'conflict' ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onResolveConflict(item.id, false)}>Ignorer</Button>
                    <Button size="sm" onClick={() => onResolveConflict(item.id, true)}>Écraser</Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">{statusLabel(item.status)}</span>
                )}
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
        {settled ? (
          <DialogFooter>
            <Button onClick={onClose}>Fermer</Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
