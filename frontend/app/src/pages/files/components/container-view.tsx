import { Download, FileMusic, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { FileOrFolder } from 'bagad-client';
import { buttonVariants } from '@/components/ui/button';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const statusLabels = new Map<string, string>([
  ['pending', 'La conversion va démarrer...'],
  ['processing', 'Conversion en cours...'],
]);

export function ContainerStatus({ container }: { container: FileOrFolder }) {
  const status = container.processingStatus ?? undefined;

  if (status === 'failed') {
    return (
      <Alert variant="destructive" className="mb-6">
        <TriangleAlert />
        <AlertTitle>La conversion a échoué</AlertTitle>
        {container.processingFailureReason ? (
          <AlertDescription>{container.processingFailureReason}</AlertDescription>
        ) : null}
      </Alert>
    );
  }

  if (status && status !== 'completed') {
    return (
      <Alert className="mb-6">
        <LoaderCircle className="animate-spin" />
        <AlertTitle>{statusLabels.get(status) ?? status}</AlertTitle>
        <AlertDescription>Les PDF apparaîtront ici dès qu&apos;ils seront prêts.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-6">
      <FileMusic className="text-primary!" />
      <AlertTitle>Dossier en lecture seule</AlertTitle>
      <AlertDescription>
        Ces PDF sont générés automatiquement à partir de
        {' '}
        <span className="font-medium">{container.name}</span>
        {' '}
        et ne peuvent pas être modifiés ici.
      </AlertDescription>
      <ContainerSourceDownload container={container} />
    </Alert>
  );
}

function ContainerSourceDownload({ container }: { container: FileOrFolder }) {
  if (!container.downloadUrl) return null;
  return (
    <AlertAction>
      <a
        href={container.downloadUrl}
        download={container.name}
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ size: 'sm' }),
          'bg-primary/15 text-primary shadow-none no-underline hover:bg-primary/25 hover:text-primary hover:no-underline',
        )}
      >
        <Download data-icon="inline-start" />
        Télécharger le fichier source
      </a>
    </AlertAction>
  );
}
