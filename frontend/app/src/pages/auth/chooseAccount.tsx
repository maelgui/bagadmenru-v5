import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';import { useAuth, useSessions } from '../../config/client';
import { cn } from '@/lib/utils';

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase();
}

/**
 * Account chooser shown after signing out of the active account while other
 * sessions remain. Rather than silently dropping the user into an arbitrary
 * account, we let them pick who to continue as (Google-style). Reached from
 * useAuth().logout when 2+ sessions remain; with 0 or 1 remaining the caller
 * skips this screen.
 */
function ChooseAccountPage() {
  const { data: sessions, isPending } = useSessions();
  const { switchAccount } = useAuth();

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 p-4 text-muted-foreground" role="status">
        <Spinner aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  const accounts = sessions ?? [];

  if (accounts.length === 0) {
    return (
      <div>
        <h1 className="mb-2 text-2xl">Aucun compte connecté</h1>
        <p className="mb-6 text-muted-foreground">
          Vous n’êtes plus connecté·e. Connectez-vous pour continuer.
        </p>
        <Link to="/auth/login" className={cn(buttonVariants())}>Se connecter</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl">Choisir un compte</h1>
      <p className="mb-6 text-muted-foreground">
        Avec quel compte souhaitez-vous continuer&nbsp;?
      </p>
      <ul className="flex flex-col gap-2">
        {accounts.map((account) => (
          <li key={account.id}>
            <button
              type="button"
              onClick={() => switchAccount(account.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Avatar className="size-10">
                <AvatarFallback>{getInitials(account.firstName, account.lastName)}</AvatarFallback>
              </Avatar>
              <span className="truncate">
                {account.firstName}
                {' '}
                {account.lastName}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link to="/auth/login" className={cn(buttonVariants({ variant: 'ghost' }))}>
          Utiliser un autre compte
        </Link>
      </div>
    </div>
  );
}

export default ChooseAccountPage;
