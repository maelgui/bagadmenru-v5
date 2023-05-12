import { createBrowserRouter } from 'react-router-dom';
import { EventsService, FilesService } from '../client';
import AuthGuard from '../layout/auth';
import MainLayout from '../layout/main';
import Debug from '../pages/debug';
import HomePage from '../pages/home';
import MyProfile from '../pages/profile';

export default createBrowserRouter([
  {
    path: '/',
    Component: MainLayout,
    children: [
      {
        index: true,
        Component: HomePage,
      },
      {
        Component: AuthGuard,
        children: [
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
            Component: Debug,
            loader: EventsService.listEventsApiV1EventsGet,
          },
        ],
      },
    ],
  },
]);
