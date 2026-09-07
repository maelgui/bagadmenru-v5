import { Link, NavLink } from 'react-router-dom';

import {
  LogOutIcon, MenuIcon, SettingsIcon, UserPlusIcon, XIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import logo from '../assets/logov2.svg';
import logoDark from '../assets/logov2-dark.svg';
import {
  useAuth,
  usePermissions,
  useSessions,
  useUserProfile,
} from '../config/client';
import { useTheme } from '../config/theme';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const {
    login, logout, switchAccount,
  } = useAuth();
  const { data: sessions = [] } = useSessions();

  if (!profile) {
    return null;
  }

  // Accounts other than the one currently active, offered for a quick switch.
  const otherAccounts = sessions.filter((s) => !s.active);

  return (
    <div className="flex w-full items-center px-3 pb-4 lg:w-auto lg:px-0 lg:py-0 lg:pb-0">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex w-full flex-row-reverse items-center justify-end gap-3 rounded-2xl p-2 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[popup-open]:bg-muted lg:mx-4 lg:w-auto lg:flex-row"
          aria-label={`Comptes - ${profile.firstName} ${profile.lastName}`}
        >
          <span className="flex min-w-0 flex-col text-left lg:text-right">
            <span className="truncate font-medium">
              {profile.firstName}
              {' '}
              {profile.lastName}
            </span>
            <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
          </span>
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={profile.pictureUrl ?? undefined} alt="" />
            <AvatarFallback>{getInitials(profile.firstName, profile.lastName)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="py-2.5"
              render={(props) => (
                <Link {...props} to="/profile/me" onClick={onNavigate} />
              )}
            >
              <Avatar className="size-9">
                <AvatarImage src={profile.pictureUrl ?? undefined} alt="" />
                <AvatarFallback>{getInitials(profile.firstName, profile.lastName)}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">
                  {profile.firstName}
                  {' '}
                  {profile.lastName}
                </span>
                <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              render={(props) => (
                <Link {...props} to="/profile/settings" onClick={onNavigate} />
              )}
            >
              <SettingsIcon className="size-4" aria-hidden="true" />
              Profil et paramètres
            </DropdownMenuItem>
          </DropdownMenuGroup>

          {otherAccounts.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Changer de compte</DropdownMenuLabel>
                {otherAccounts.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    className="py-2.5"
                    onClick={() => switchAccount(s.id)}
                  >
                    <Avatar className="size-9">
                      <AvatarFallback>{getInitials(s.firstName, s.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">
                        {s.firstName}
                        {' '}
                        {s.lastName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{s.email}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          ) : null}

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => login()}>
              <UserPlusIcon className="size-4" aria-hidden="true" />
              Ajouter un compte
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logout()}>
              <LogOutIcon className="size-4" aria-hidden="true" />
              Se déconnecter de ce compte
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function Navbar() {
  const navigationItems = useNavigationItems();
  const { resolvedTheme } = useTheme();
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
              <img src={resolvedTheme === 'dark' ? logoDark : logo} alt="Bagad Men Ru" />
            </div>
            <div>
              <span className="font-semibold whitespace-nowrap text-foreground">Bagad Men Ru</span>
              <br />
              <span className="whitespace-nowrap text-muted-foreground">Espace membres</span>
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
