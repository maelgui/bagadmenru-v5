import type { ComponentType } from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';
import AuthGuard from '../guards/auth';
import MainLayout from '../layout/main';
import { SimpleLayoutWithOutlet } from '../layout/simple';
import RoutingErrorComponent from '../pages/error/error';

/**
 * Wraps a dynamic import so React Router only loads the page chunk when the
 * route is visited (route-based code splitting).
 */
function lazyPage(loader: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await loader()).default });
}

export default createBrowserRouter([
  {
    path: '/',
    ErrorBoundary: RoutingErrorComponent,
    children: [
      {
        Component: AuthGuard,
        children: [
          {
            Component: MainLayout,
            children: [
              {
                index: true,
                lazy: lazyPage(async () => await import('../pages/home/home')),
              },
              {
                path: '/events',
                lazy: lazyPage(async () => await import('../pages/events/doodle')),
              },
              {
                path: '/events/planning',
                lazy: lazyPage(async () => await import('../pages/events/planning')),
              },
              {
                path: '/events/manage',
                lazy: lazyPage(async () => await import('../pages/events/events')),
              },
              {
                path: '/events/calendar',
                lazy: lazyPage(async () => await import('../pages/events/calendar')),
              },
              {
                path: '/events/add',
                lazy: lazyPage(async () => await import('../pages/events/add')),
              },
              {
                path: '/events/edit/:eventId',
                lazy: lazyPage(async () => await import('../pages/events/edit')),
              },
              {
                path: '/files/:folderId?',
                lazy: lazyPage(async () => await import('../pages/files/list')),
              },
              {
                path: '/profile',
                lazy: lazyPage(async () => await import('../pages/profiles/list')),
              },
              {
                path: '/profile/me',
                lazy: lazyPage(async () => await import('../pages/profiles/me')),
              },
              {
                path: '/profile/settings',
                lazy: async () => ({
                  Component: (await import('../pages/profiles/settingsLayout')).default,
                }),
                children: [
                  {
                    index: true,
                    loader: () => redirect('/profile/settings/profile'),
                  },
                  {
                    path: 'profile',
                    lazy: lazyPage(async () => await import('../pages/profiles/settings/profile')),
                  },
                  {
                    path: 'account',
                    lazy: lazyPage(async () => await import('../pages/profiles/settings/account')),
                  },
                  {
                    path: 'appearance',
                    lazy: lazyPage(async () => await import('../pages/profiles/settings/appearance')),
                  },
                  {
                    path: 'security',
                    lazy: lazyPage(async () => await import('../pages/profiles/settings/security')),
                  },
                  {
                    path: 'notifications',
                    lazy: lazyPage(async () => await import('../pages/profiles/settings/notifications')),
                  },
                ],
              },
              {
                path: '/profile/passkeys',
                loader: () => redirect('/profile/settings/security'),
              },
              {
                path: '/profile/:profileId',
                lazy: lazyPage(async () => await import('../pages/profiles/show')),
              },
              {
                path: '/profile/edit/me',
                loader: () => redirect('/profile/settings/profile'),
              },
              {
                path: '/profile/edit/:profileId',
                lazy: lazyPage(async () => await import('../pages/profiles/edit')),
              },
              {
                path: '/profile/add',
                lazy: lazyPage(async () => await import('../pages/profiles/add')),
              },
              {
                path: '/profile/invite',
                lazy: lazyPage(async () => await import('../pages/invitations/generate')),
              },
              {
                path: '/profile/rankings',
                lazy: lazyPage(async () => await import('../pages/profiles/rankings')),
              },
              {
                path: '/groups',
                lazy: lazyPage(async () => await import('../pages/groups/list')),
              },
              {
                path: '/groups/:groupId',
                lazy: lazyPage(async () => await import('../pages/groups/group')),
              },
              {
                path: '/groups/add',
                lazy: lazyPage(async () => await import('../pages/groups/add')),
              },
              {
                path: '/groups/edit/:groupId',
                lazy: lazyPage(async () => await import('../pages/groups/edit')),
              },
            ],
          },
        ],
      },
      {
        path: '/s/',
        Component: SimpleLayoutWithOutlet,
        children: [
          {
            path: 'answer/:token',
            lazy: lazyPage(async () => await import('../pages/events/answer')),
          },
          {
            path: 'unsubscribe/:token',
            lazy: lazyPage(async () => await import('../pages/auth/unsubscribe')),
          },
        ],
      },
      {
        path: '/invite/',
        Component: SimpleLayoutWithOutlet,
        children: [
          {
            path: ':token',
            lazy: lazyPage(async () => await import('../pages/invitations/invite')),
          },
        ],
      },
      {
        path: '/auth/',
        Component: SimpleLayoutWithOutlet,
        children: [
          {
            path: 'login',
            lazy: lazyPage(async () => await import('../pages/auth/login')),
          },
          {
            path: 'choose',
            lazy: lazyPage(async () => await import('../pages/auth/chooseAccount')),
          },
          {
            path: 'reset',
            lazy: lazyPage(async () => await import('../pages/auth/lostPassword')),
          },
          {
            path: 'reset/:token',
            lazy: lazyPage(async () => await import('../pages/auth/changePassword')),
          },
        ],
      },
    ],
  },
]);
