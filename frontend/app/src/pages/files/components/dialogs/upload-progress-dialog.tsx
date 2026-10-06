import { CloudUpload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function UploadProgressDialog({ open }: { open: boolean }) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CloudUpload />Envoi des fichiers...</DialogTitle>
          <DialogDescription>Les fichiers sélectionnés sont en cours d&apos;envoi.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
