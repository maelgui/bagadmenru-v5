import { OctagonX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Shown when an invitation token is missing, expired, or already used. */
export default function InvalidInvitationAlert() {
  return (
    <div>
      <Alert variant="destructive" className="mb-6">
        <OctagonX aria-hidden="true" />
        <AlertTitle>Invitation invalide</AlertTitle>
        <AlertDescription>
          Cette invitation est invalide, a expiré ou a déjà été utilisée.
          Demandez un nouveau lien à la personne qui vous a invité·e.
        </AlertDescription>
      </Alert>
      <Link to="/" className={cn(buttonVariants({ variant: 'ghost' }))}>Retour</Link>
    </div>
  );
}
