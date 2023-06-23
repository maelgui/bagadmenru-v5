import { Link, NavLink } from 'react-router-dom';

import { useOidc, useOidcIdToken } from '@axa-fr/react-oidc';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import logo from '../assets/logo.svg';
import Button from './button';

export default function Navbar() {
  const { idTokenPayload } = useOidcIdToken();
  const { logout, isAuthenticated } = useOidc();

  const [show, setShow] = useState<boolean>();

  return (
    <header className="shadow-md">
      <div className="block md:flex items-center container m-auto transition">
        <div className="flex items-center h-16">
          <div className="h-10 w-10 mx-8 ">
            <img src={logo} alt="Vite logo" />

          </div>
          <NavLink to="/" className="before:absolute">
            <span className="text-gray-950 font-semibold">Bagad Men Ru</span>
            <br />
            <span className="text-gray-700">Espace membres</span>
          </NavLink>
          <button
            type="button"
            className="ml-auto block md:hidden"
            aria-label="open-menu"
            onClick={() => setShow(!show)}
          >
            <FontAwesomeIcon icon={faBars} size="xl" className="mx-8" />
          </button>
        </div>
        <div className={`${show ? '' : 'hidden'} md:flex grow justify-between items-center`}>
          <nav className="py-4 md:py-0">
            <ul className="flex flex-col md:flex-row">
              <li className="px-3 py-2">
                <NavLink
                  to="/"
                  className={({ isActive }) => `px-4 py-3 font-semibold text-gray-800 ${isActive ? 'text-pourpre-500' : ''}`}
                >
                  Dashboard
                </NavLink>

              </li>
              <li className="px-3 py-2 tracking-wide">
                <NavLink
                  className={({ isActive }) => `px-4 py-3 font-semibold text-gray-800 ${isActive ? 'text-pourpre-500' : ''}`}
                  to="/events"
                >
                  Calendrier
                </NavLink>

              </li>
              <li className="px-3 py-2 tracking-wide">
                <NavLink
                  className={({ isActive }) => `px-4 py-3 font-semibold text-gray-800 ${isActive ? 'text-pourpre-500' : ''}`}
                  to="/files"
                >
                  Fichiers
                </NavLink>

              </li>
              <li className="px-3 py-2 tracking-wide">
                <NavLink
                  className={({ isActive }) => `px-4 py-3 font-semibold text-gray-800 ${isActive ? 'text-pourpre-500' : ''}`}
                  to="/albums"
                >
                  Photos
                </NavLink>

              </li>
              <li className="px-3 py-2 tracking-wide">
                <NavLink
                  className={({ isActive }) => `px-4 py-3 font-semibold text-gray-800 ${isActive ? 'text-pourpre-500' : ''}`}
                  to="/users"
                >
                  Trombinoscope
                </NavLink>

              </li>
            </ul>
          </nav>
          <div className="flex items-center pb-4 md:py-0">
            {isAuthenticated
              ? (
                <>
                  <Link to="/profile" className="md:order-last">
                    <img className="h-10 w-10 mx-8 rounded-full" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
                  </Link>
                  <div className="md:text-right md:py-2">
                    <span>
                      {idTokenPayload.given_name}
                      {' '}
                    </span>
                    <span>{idTokenPayload.family_name}</span>
                    <br />
                    <Button type="button" size="sm" outline onClick={() => logout()}>Déconnexion</Button>
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
