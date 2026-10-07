import { AlertCircle, Trash2 } from 'lucide-react';
import type { FileOrFolder } from 'bagad-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DeleteFileDialog({
  file, isPending, onConfirm, onClose,
}: {
  file?: FileOrFolder;
  isPending: boolean;
  onConfirm: (fileId: number) => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open={file !== undefined} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia><AlertCircle className="text-destructive" /></AlertDialogMedia>
          <AlertDialogTitle>Supprimer un fichier</AlertDialogTitle>
          <AlertDialogDescription>Vous vous apprêtez à supprimer le fichier <strong>{file?.name}</strong>. Êtes-vous sûr de vouloir supprimer ce fichier ?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={file === undefined}
            pending={isPending}
            onClick={() => { if (file) onConfirm(file.id); }}
          >
            {!isPending && <Trash2 data-icon="inline-start" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
