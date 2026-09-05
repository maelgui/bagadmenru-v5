import { HeartIcon } from 'lucide-react';

import VersionInfo from './version-info';

export default function Footer() {
  return (
    <footer className="mt-24 px-4 py-8 text-center shadow">
      <span className="group text-muted-foreground transition-colors hover:text-foreground">
        Made with
        {' '}
        <HeartIcon className="inline size-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
        {' '}
        by Mael G.
      </span>
      <VersionInfo />
    </footer>
  );
}
