import type { PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';

import emblem from '../assets/logov2.svg';
import logoFullDark from '../assets/logov2full-dark.svg';
import VersionInfo from '../components/version-info';
import { useRouteProgress } from '../utils/useRouteProgress';

/**
 * Shell des pages plein écran (auth, invitations, erreurs).
 *
 * Desktop : split-screen avec un panneau de marque bordeaux (lockup vertical
 * centré, tagline) et le contenu à droite.
 * Mobile : colonne simple — liseré bordeaux, signature discrète (emblème +
 * nom) en haut, le titre de la page reste l'élément dominant.
 */
export default function SimpleLayout({ children }: PropsWithChildren) {
  const busy = useRouteProgress();

  return (
    <div className={`${busy ? 'loading' : ''} flex min-h-screen flex-col lg:flex-row`}>
      {/* Panneau de marque flottant (desktop uniquement). En dark, le fond
          passe sur le vin le plus profond de la gamme bordeaux existante
          (chart-5, valeur identique dans les deux thèmes) : le panneau reste
          « pierre rouge » sans écraser la gravure du logo. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:m-4 lg:flex lg:w-1/2 lg:rounded-3xl dark:border dark:bg-chart-5">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/25 dark:from-white/5 dark:to-black/40" />
        <img
          src={logoFullDark}
          alt="Logo du Bagad Men Ru"
          className="relative m-auto max-h-[26rem] w-auto drop-shadow-lg"
        />
        <p className="relative max-w-sm text-lg leading-relaxed text-primary-foreground/80">
          Depuis 1995, la musique bretonne à Montfort-sur-Meu.
          <br />
          L&apos;espace des sonneurs et sonneuses du bagad.
        </p>
      </div>

      {/* Colonne contenu ; sur mobile : liseré + signature discrète */}
      <div className="relative flex flex-1 flex-col p-4">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary lg:hidden" />
        <div className="mt-4 flex items-center gap-2.5 lg:hidden">
          <div
            aria-hidden
            className="size-7 bg-muted-foreground [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
            style={{ maskImage: `url(${emblem})` }}
          />
          <span className="text-sm font-medium text-muted-foreground">Bagad Men Ru</span>
        </div>
        <main className="m-auto w-full max-w-md [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight">
          {children}
        </main>
        <footer className="text-center">
          <VersionInfo />
        </footer>
      </div>
    </div>
  );
}

export function SimpleLayoutWithOutlet() {
  return (
    <SimpleLayout>
      <Outlet />
    </SimpleLayout>
  );
}
