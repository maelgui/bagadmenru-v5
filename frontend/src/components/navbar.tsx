import { Link, NavLink } from 'react-router-dom';

import logo from '../assets/logo.svg';

export default function Navbar() {
  return (
    <header className="shadow-md">
      <div className="flex h-16 items-center justify-between container m-auto">
        <div className="flex items-center">
          <img src={logo} className="h-10 w-10 m-8" alt="Vite logo" />
          <div>
            <span className="text-gray-950 font-semibold">Bagad Men Ru</span>
            <br />
            <span className="text-gray-700">Espace membres</span>
          </div>
        </div>
        <nav className="">
          <ul className="flex">
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
        <div>
          <Link to="/profile">
            <img className="h-10 w-10 m-8 rounded-full" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
          </Link>
        </div>
      </div>
    </header>

  );
}
