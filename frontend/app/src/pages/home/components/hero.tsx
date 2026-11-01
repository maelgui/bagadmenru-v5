import logo from '../../../assets/logov2.svg';
import Container from '../../../components/container';
import { SearchField } from '../../../components/global-search/triggers';
import { useTheme } from '../../../config/theme';
import { brandGradient } from '../../../utils/brand-gradient';

export default function HomeHero({ firstName }: { firstName?: string }) {
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
          <SearchField size="lg" className="mt-6" />
        </div>
      </Container>
    </section>
  );
}
