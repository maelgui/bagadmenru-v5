import { faCaretRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { Link } from 'react-router-dom';
import Button, { ButtonProps } from './button';
import Container from './container';

interface BreadcrumbItem {
  title: React.ReactNode
  link?: string
}
interface HeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode | undefined
  actions?: React.ReactElement<HeaderActionProps>[]
  breadcrumb?: BreadcrumbItem[]
}

interface HeaderActionProps extends ButtonProps {
  children: React.ReactNode
}

function HeaderAction({ children, ...rest }: HeaderActionProps) {
  return (
    <Button
      type="button"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...rest}
    >
      {children}
    </Button>
  );
}

export default function Header({
  title,
  subtitle = undefined,
  actions = [],
  breadcrumb = [],
}: HeaderProps) {
  return (
    <>
      <div className="bg-pourpre-50 shadow-inner py-2">
        <Container>
          <ul className="flex text-sm">
            <li className="font-semibold mr-2">Navigation :</li>
            <li className="mx-2">{breadcrumb.length ? <Link to="/" className="underline underline-offset-4 hover:decoration-2">Accueil</Link> : 'Accueil'}</li>
            {breadcrumb.map((item) => (
              <React.Fragment key={item.link}>
                <li className="mx-2 text-gray-600"><FontAwesomeIcon icon={faCaretRight} className="pl-2" /></li>
                <li className="mx-2">
                  {item.link ? <Link to={item.link} className="underline underline-offset-4 hover:decoration-2">{item.title}</Link> : item.title}
                </li>
              </React.Fragment>
            ))}
          </ul>
        </Container>
      </div>
      <div className="py-8">
        <Container>
          <div className="flex justify-between items-center">

            <div>
              <h2 className="text-4xl">{title}</h2>
              <h4 className="text-lg text-gray-500">{subtitle}</h4>
            </div>

            <div className="m-l-auto text-right">
              {actions.map((action) => action)}
            </div>
          </div>
        </Container>

      </div>
    </>
  );
}

Header.Action = HeaderAction;
