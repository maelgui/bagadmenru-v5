import { Link, NavLink } from 'react-router-dom';

import { useOidc } from '@axa-fr/react-oidc';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReactNode, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import logo from '../assets/logov2.svg';
import { useApiClient } from '../config/client';
import Avatar from './avatar';
import Button from './button';

function CustomNavLink({ to, children }: { to: string, children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `px-4 py-3 font-semibold text-gray-800 underline-offset-8 hover:underline hover:decoration-2 ${isActive ? 'text-pourpre-500 underline' : ''}`}
    >
      {children}
    </NavLink>

  );
}

export default function Navbar() {
  const { logout, isAuthenticated } = useOidc();
  const { usersApi } = useApiClient();

  const { data: profile } = useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: () => usersApi.getMyProfileApiV1ProfilesMeGet(),
  });

  const [show, setShow] = useState<boolean>();

  return (
    <header className="shadow-md">
      <div className="block lg:flex items-center container m-auto transition">
        <div className="flex items-center h-24">
          <NavLink to="/" className="flex items-center">
            <div className=" w-12 mx-8 ">
              <img src={logo} alt="Vite logo" />
            </div>
            <div>
              <span className="text-gray-950 font-semibold whitespace-nowrap">Bagad Men Ru</span>
              <br />
              <span className="text-gray-700 whitespace-nowrap">Espace membres</span>
            </div>
          </NavLink>
          <button
            type="button"
            className="ml-auto block lg:hidden"
            aria-label="open-menu"
            onClick={() => setShow(!show)}
            onBlur={() => setTimeout(() => setShow(false), 200)}
          >
            <FontAwesomeIcon icon={faBars} size="xl" className="mx-8" />
          </button>
        </div>
        <div className={`${show ? '' : 'hidden'} lg:flex grow justify-between items-center`}>
          <nav className="py-4 md:py-0">
            <ul className="flex flex-col lg:flex-row">
              <li className="px-3 py-2">
                <CustomNavLink to="/">Dashboard</CustomNavLink>
              </li>
              <li className="px-3 py-2 tracking-wide">
                <CustomNavLink to="/events/doodle">Évènements</CustomNavLink>
              </li>
              <li className="px-3 py-2 tracking-wide">
                <CustomNavLink to="/files">Fichiers</CustomNavLink>
              </li>
              <li className="px-3 py-2 tracking-wide">
                <CustomNavLink to="/photos">Photos</CustomNavLink>
              </li>
              <li className="px-3 py-2 tracking-wide">
                <CustomNavLink to="/users">Trombinoscope</CustomNavLink>
              </li>
            </ul>
          </nav>

          <div className="flex items-center pb-4 lg:py-0">
            {isAuthenticated && profile
              ? (
                <>
                  <Link to="/profile" className="lg:order-last">
                    <Avatar src={profile.pictureUrl} size="xs" className="m-8" />
                  </Link>
                  <div className="lg:text-right lg:py-2">
                    <div className="whitespace-nowrap">
                      <span>
                        {profile.firstName}
                        {' '}
                      </span>
                      <span>{profile.lastName}</span>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => logout()}>Déconnexion</Button>
                  </div>
                </>
              )
              : null}
          </div>

        </div>
      </div>
    </header>

  );
}
