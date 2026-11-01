import { SearchIcon } from 'lucide-react';
import logo from '../../../assets/logov2.svg';
import Container from '../../../components/container';
import { SEARCH_SHORTCUT, useOpenGlobalSearch } from '../../../components/global-search/global-search';
import { useTheme } from '../../../config/theme';
import { brandGradient } from '../../../utils/brand-gradient';

export default function HomeHero({ firstName }: { firstName?: string }) {
  const openSearch = useOpenGlobalSearch();
  const { resolvedTheme } = useTheme();

  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative overflow-hidden"
      style={{ backgroundImage: brandGradient(resolvedTheme === 'dark') }}
    >
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -bottom-24 w-80 opacity-[0.07] select-none lg:w-[26rem]"
      />
      <Container className="relative py-8 lg:py-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <h2 id="home-hero-title" className="text-4xl lg:text-5xl">
            <span lang="br" title={`Bienvenue ${firstName}`}>{`Degemer mat ${firstName}`}</span>
          </h2>
          <p className="mt-2 text-lg text-muted-foreground">Que cherchez-vous aujourd’hui ?</p>
          <button
            type="button"
            onClick={openSearch}
            aria-keyshortcuts={SEARCH_SHORTCUT.aria}
            className="mt-6 flex h-14 w-full items-center gap-3 rounded-full border border-input bg-card px-5 text-left text-base text-muted-foreground shadow-lg transition-colors hover:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <SearchIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="flex-1 truncate">Une partition, un évènement, un membre…</span>
            <kbd className="hidden shrink-0 rounded-md border bg-muted px-2 py-0.5 font-sans text-xs sm:inline" aria-hidden="true">
              {SEARCH_SHORTCUT.label}
            </kbd>
          </button>
        </div>
      </Container>
    </section>
  );
}
