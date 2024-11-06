import { Link, NavLink } from 'react-router-dom';

import { faBars } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReactNode, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from 'react-oidc-context';
import logo from '../assets/logov2.svg';
import {
  queryClient,
  usePermissions, useUserProfile,
} from '../config/client';
import Avatar from './avatar';
import Button from './button';

interface CustomNavLinkProps {
  to: string,
  children: ReactNode,
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
}
function CustomNavLink({ to, children, onClick = undefined }: CustomNavLinkProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `px-4 py-3 font-semibold text-gray-800 underline-offset-8 hover:underline hover:decoration-2 ${isActive ? 'text-pourpre-500 underline' : ''}`}
    >
      {children}
    </NavLink>

  );
}

export default function Navbar() {
  const profile = useUserProfile();
  const { signoutRedirect } = useAuth();
  const { has } = usePermissions();

  const [show, setShow] = useState<boolean>();

  const { mutate: logout } = useMutation({
    mutationFn: () => signoutRedirect({ post_logout_redirect_uri: 'https://bagadmenru.bzh' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] }).then(() => {
        toast.success('Déconnexion réussie !');
      });
    },
    onError: (error) => {
      toast.error(`Erreur lors de la déconnexion : ${error.message}`);
    },
  });

  const close = () => setShow(false);

  return (
    <header className="shadow-md">
      <div className="block lg:flex items-center container m-auto transition">
        <div className="flex items-center h-24">
          <NavLink to="/" className="flex items-center" onClick={close}>
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
            onBlur={() => setTimeout(close, 200)}
          >
            <FontAwesomeIcon icon={faBars} size="xl" className="mx-8" />
          </button>
        </div>
        <div className={`${show ? '' : 'hidden'} absolute bg-white w-full lg:static lg:flex grow justify-between items-center border-b-pourpre-500 border-b-2 lg:border-0 z-50`}>
          <nav className="py-4 md:py-0">
            <ul className="flex flex-col lg:flex-row">
              <li className="px-3 py-2">
                <CustomNavLink to="/" onClick={close}>Accueil</CustomNavLink>
              </li>
              <li className={`px-3 py-2 tracking-wide ${has('EventScopes.VIEW') ? '' : 'hidden'}`}>
                <CustomNavLink to={`/events/${has('EventScopes.ANSWER') ? '' : 'calendar'}`} onClick={close}>Évènements</CustomNavLink>
              </li>
              <li className={`px-3 py-2 tracking-wide ${has('FileScopes.VIEW') ? '' : 'hidden'}`}>
                <CustomNavLink to="/files" onClick={close}>Fichiers</CustomNavLink>
              </li>
              <li className={`px-3 py-2 tracking-wide ${has('AlbumScopes.VIEW') ? '' : 'hidden'}`}>
                <CustomNavLink to="/photos" onClick={close}>Photos</CustomNavLink>
              </li>
              <li className={`px-3 py-2 tracking-wide ${has('ProfilesScopes.VIEW') ? '' : 'hidden'}`}>
                <CustomNavLink to="/profile" onClick={close}>Trombinoscope</CustomNavLink>
              </li>
            </ul>
          </nav>

          <div className="flex items-center pb-4 lg:py-0">
            {profile
              ? (
                <>
                  <Link to="/profile/me" className="lg:order-last">
                    <Avatar src={profile.pictureUrl} size="xs" className="m-8" />
                  </Link>
                  <div className="lg:text-right lg:py-2">
                    <div className="whitespace-nowrap mx-1">
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
