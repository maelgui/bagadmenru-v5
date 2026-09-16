import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Shared chrome of the pre-sign-in recovery steps: back button + title. */
export default function ResetHeader() {
  return (
    <>
      <Link
        to="/auth/login"
        aria-label="Retour à la connexion"
        className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'mb-6 rounded-full')}
      >
        <ArrowLeft />
      </Link>
      <h1 className="mb-2 text-2xl">Impossible de vous connecter&nbsp;?</h1>
    </>
  );
}
