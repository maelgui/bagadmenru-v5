import type { ReactElement, ReactNode } from 'react';
import { ChevronRightIcon, HouseIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import Container from './container';

interface BreadcrumbItem {
  title: ReactNode;
  link?: string;
}

interface HeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactElement[];
  breadcrumb?: BreadcrumbItem[];
}

interface HeaderComponent {
  (props: HeaderProps): ReactElement;
  Action: typeof Button;
}

function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div
      className="py-2 shadow-inner"
      style={{ backgroundImage: 'linear-gradient(to right, #ffe3f3, #f5e0f8, #e7dffd, #d5dfff, #c1dfff)' }}
    >
      <Container className="py-0">
        <nav aria-label="Fil d’Ariane" className="text-sm">
          <ol className="flex items-center overflow-x-auto py-1">
            <li className="mx-2 flex items-center">
              <Link
                to="/"
                className="underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label="Accueil"
              >
                <HouseIcon className="size-4" aria-hidden="true" />
              </Link>
            </li>
            {items.map((item, index) => {
              const isLast = index === items.length - 1;
              return (
                <li key={item.link ?? `final-${index}`} className="flex min-w-0 items-center text-nowrap">
                  <ChevronRightIcon className="mx-2 size-3.5 shrink-0 text-gray-600" aria-hidden="true" />
                  {item.link ? (
                    <Link
                      to={item.link}
                      className="mx-2 underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <span aria-current={isLast ? 'page' : undefined} className="mx-2">
                      {item.title}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </Container>
    </div>
  );
}

const Header: HeaderComponent = ({
  title,
  subtitle,
  actions = [],
  breadcrumb = [],
}: HeaderProps) => (
  <header>
    {breadcrumb.length !== 0 ? <Breadcrumb items={breadcrumb} /> : null}
    <div className="py-8">
      <Container>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="min-w-0">
            <h2 className="text-4xl">{title}</h2>
            {subtitle ? <p className="text-lg text-gray-500 first-letter:uppercase">{subtitle}</p> : null}
          </div>
          {actions.length !== 0 ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </Container>
    </div>
  </header>
);

Header.Action = Button;

export default Header;
