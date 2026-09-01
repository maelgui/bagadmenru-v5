import { Link, NavLink } from 'react-router-dom';

import { MenuIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import logo from '../assets/logov2.svg';
import {
  useAuth,
  usePermissions,
  useUserProfile,
} from '../config/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

interface NavigationItem {
  label: string;
  to: string;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase();
}

function useNavigationItems(): NavigationItem[] {
  const { can } = usePermissions();

  return [
    { label: 'Accueil', to: '/' },
    ...(can('view', 'event')
      ? [{
          label: 'Évènements',
          to: `/events/${can('create', 'response') ? '' : 'calendar'}`,
        }]
      : []),
    ...(can('view', 'file')
      ? [{ label: 'Fichiers', to: '/files' }]
      : []),
    ...(can('view', 'profile')
      ? [{ label: 'Trombinoscope', to: '/profile' }]
      : []),
  ];
}

function ProfileActions({ onNavigate }: { onNavigate: () => void }) {
  const profile = useUserProfile();
  const { logout } = useAuth();

  if (!profile) {
    return null;
  }

  return (
    <div className="flex items-center pb-4 lg:py-0">
      <Link
        to="/profile/me"
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:order-last"
        aria-label={`Profil de ${profile.firstName} ${profile.lastName}`}
        onClick={onNavigate}
      >
        <Avatar className="mx-6 size-12">
          <AvatarImage src={profile.pictureUrl ?? undefined} alt="" />
          <AvatarFallback>{getInitials(profile.firstName, profile.lastName)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="lg:py-2 lg:text-right">
        <div className="mx-1 whitespace-nowrap">
          {profile.firstName}
          {' '}
          {profile.lastName}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => logout()}>
          Déconnexion
        </Button>
      </div>
    </div>
  );
}

export default function Navbar() {
  const navigationItems = useNavigationItems();
  const [show, setShow] = useState(false);

  const close = () => setShow(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="relative shadow-md">
      <div className="container m-auto flex h-24 items-center">
        <div className="flex items-center lg:flex-1">
          <NavLink
            to="/"
            className="flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={close}
          >
            <div className="mx-8 w-12">
              <img src={logo} alt="Bagad Men Ru" />
            </div>
            <div>
              <span className="font-semibold whitespace-nowrap text-gray-950">Bagad Men Ru</span>
              <br />
              <span className="whitespace-nowrap text-gray-700">Espace membres</span>
            </div>
          </NavLink>
        </div>

        <NavigationMenu className="hidden lg:flex" aria-label="Navigation principale">
          <NavigationMenuList>
            {navigationItems.map((item) => (
              <NavigationMenuItem key={item.to}>
                <NavigationMenuLink
                  className="px-4 font-medium whitespace-nowrap"
                  render={({ className: baseClassName, ...props }) => (
                    <NavLink
                      {...props}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={close}
                      className={({ isActive }) => cn(baseClassName, isActive && 'text-primary')}
                    />
                  )}
                >
                  {item.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden justify-end lg:flex lg:flex-1">
          <ProfileActions onNavigate={close} />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mx-6 ml-auto lg:hidden"
          aria-label={show ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={show}
          aria-controls="mobile-navigation"
          onClick={() => setShow((isOpen) => !isOpen)}
        >
          {show ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
        </Button>
      </div>

      <div
        id="mobile-navigation"
        className={cn(
          'absolute z-40 w-full border-b-2 border-b-primary bg-background shadow-md lg:hidden',
          show ? 'block' : 'hidden',
        )}
      >
        <nav className="py-4" aria-label="Navigation principale">
          <ul className="flex flex-col gap-1 px-3">
            {navigationItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={close}
                  className={({ isActive: linkActive }) => cn(
                    'flex items-center rounded-3xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    linkActive && 'bg-muted/50 text-primary',
                  )}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <ProfileActions onNavigate={close} />
      </div>
    </header>
  );
}
