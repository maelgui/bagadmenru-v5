import { Link, NavLink } from 'react-router-dom';

import logo from '../assets/logo.svg';

export default function Navbar() {
  return (
    <header>
      <div className="flex h-16 items-center justify-between container m-auto">
        <div className="flex items-center">
          <img src={logo} className="h-10 w-10 m-8" alt="Vite logo" />
          <div>
            Bagad Men Ru
            <br />
            Espace membre
          </div>
        </div>
        <nav className="flex-1">
          <ul className="flex justify-around">
            <li className="px-3 py-2">
              <NavLink
                to="/"
                className={({ isActive }) => `border-4 border-white px-4 py-3 ${isActive ? 'border-4 border-b-pourpre text-pourpre' : ''}`}
              >
                Dashboard
              </NavLink>

            </li>
            <li className="px-3 py-2 tracking-wide">
              <NavLink
                className={({ isActive }) => `border-4 border-white px-4 py-3 ${isActive ? 'border-4 border-b-pourpre text-pourpre' : ''}`}
                to="/profile"
              >
                Profile
              </NavLink>

            </li>
            <li className="px-3 py-2 tracking-wide">
              <NavLink
                className={({ isActive }) => `border-4 border-white px-4 py-3 ${isActive ? 'border-4 border-b-pourpre text-pourpre' : ''}`}
                to="/events"
              >
                Calendrier
              </NavLink>

            </li>
            <li className="px-3 py-2 tracking-wide">
              <NavLink
                className={({ isActive }) => `border-4 border-white px-4 py-3 ${isActive ? 'border-4 border-b-pourpre text-pourpre' : ''}`}
                to="/files"
              >
                Fichiers
              </NavLink>

            </li>
            <li className="px-3 py-2 tracking-wide">
              <NavLink
                className={({ isActive }) => `border-4 border-white px-4 py-3 ${isActive ? 'border-4 border-b-pourpre text-pourpre' : ''}`}
                to="/albums"
              >
                Photos
              </NavLink>

            </li>
            <li className="px-3 py-2 tracking-wide">
              <NavLink
                className={({ isActive }) => `border-4 border-white px-4 py-3 ${isActive ? 'border-4 border-b-pourpre text-pourpre' : ''}`}
                to="/users"
              >
                Trombinoscope
              </NavLink>

            </li>
          </ul>
        </nav>
        <div>
          <Link to="/profile">
            <img className="h-10 w-10 rounded-full" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
          </Link>
        </div>
      </div>
    </header>

  );
}
