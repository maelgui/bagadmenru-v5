import { createBrowserRouter } from 'react-router-dom';
import { FilesService, UsersService } from '../client';
import AuthGuard from '../layout/auth';
import MainLayout from '../layout/main';
import Debug from '../pages/debug';
import CalendarPage, { eventsLoader } from '../pages/events/calendar';
import DoodlePage, { doodleAction, doodleDataLoader } from '../pages/events/doodle';
import HomePage from '../pages/home';
import MyProfile from '../pages/profile';
import ProfilesPage from '../pages/trombi';

export default createBrowserRouter([
  {
    path: '/',
    Component: MainLayout,
    children: [
      {
        Component: AuthGuard,
        children: [
          {
            index: true,
            Component: HomePage,
          },
          {
            path: '/profile',
            Component: MyProfile,
          },
          {
            path: '/files',
            Component: Debug,
            loader: FilesService.getRootApiV1FilesGet,
          },
          {
            path: '/events',
            Component: CalendarPage,
            loader: eventsLoader,
          },
          {
            path: '/events/doodle',
            Component: DoodlePage,
            loader: doodleDataLoader,
            action: doodleAction,
          },
          {
            path: '/users',
            Component: ProfilesPage,
            loader: UsersService.listProfilesApiV1ProfilesGet,
          },
        ],
      },
    ],
  },
]);
