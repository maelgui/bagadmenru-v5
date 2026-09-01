import { useIsFetching } from '@tanstack/react-query';

import { Spinner } from '@/components/ui/spinner';
import logo from '../assets/logov2full.svg';

export default function ErrorLayout({ children }: React.ComponentPropsWithoutRef<'div'>) {
  const isFetching = useIsFetching();

  return (
    <div className="flex min-h-screen bg-muted/40 p-4 text-foreground">
      <div className="m-auto flex w-full max-w-md flex-col items-center gap-6">
        <div className="relative flex justify-center">
          <img src={logo} alt="Bagad Men Ru" className="h-64" />
          {isFetching ? <Spinner className="absolute right-0 top-0" aria-label="Chargement" /> : null}
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
