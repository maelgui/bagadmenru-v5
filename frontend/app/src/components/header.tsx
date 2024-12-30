import { faCaretRight, faHouse } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { Link } from 'react-router-dom';
import Button from './button';
import Container from './container';

interface BreadcrumbItem {
  title: React.ReactNode
  link?: string
}
interface HeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode | undefined
  actions?: React.ReactElement<typeof HeaderAction>[]
  breadcrumb?: BreadcrumbItem[]
}

const HeaderAction = Button;

export default function Header({
  title,
  subtitle = undefined,
  actions = [],
  breadcrumb = [],
}: HeaderProps) {
  return (
    <>
      {breadcrumb.length !== 0 ? (
        <div className="shadow-inner py-2" style={{ backgroundImage: 'linear-gradient(to right, #ffe3f3, #f5e0f8, #e7dffd, #d5dfff, #c1dfff)' }}>
          <Container>
            <ul className="flex text-sm overflow-x-auto">
              <li className="mx-2"><Link to="/" className="underline underline-offset-4 hover:decoration-2"><FontAwesomeIcon icon={faHouse} /></Link></li>
              {breadcrumb.map((item, index) => (
                <React.Fragment key={item.link ?? `final-${index}`}>
                  <li className="mx-2 text-gray-600"><FontAwesomeIcon icon={faCaretRight} className="px-2" /></li>
                  <li className="mx-2 text-nowrap">
                    {item.link ? <Link to={item.link} className="underline underline-offset-4 hover:decoration-2">{item.title}</Link> : item.title}
                  </li>
                </React.Fragment>
              ))}
            </ul>
          </Container>
        </div>
      ) : null}
      <div className="py-8">
        <Container>
          <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">

            <div>
              <h2 className="text-4xl">{title}</h2>
              <h4 className="text-lg text-gray-500 first-letter:uppercase">{subtitle}</h4>
            </div>

            <div>
              {actions.map((action) => <span key={action.key}>{action}</span>)}
            </div>
          </div>
        </Container>

      </div>
    </>
  );
}

Header.Action = HeaderAction;
