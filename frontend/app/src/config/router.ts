import { createBrowserRouter } from 'react-router-dom';
import AuthGuard from '../layout/auth';
import MainLayout from '../layout/main';
import ProfileGuard from '../layout/profile';
import AddEventPage from '../pages/events/add';
import CalendarPage from '../pages/events/calendar';
import DoodlePage from '../pages/events/doodle';
import EditEventPage from '../pages/events/edit';
import ManageEventsPage from '../pages/events/manage';
import ListFilesPage from '../pages/files/list';
import HomePage from '../pages/home';
import MyProfile from '../pages/profile';
import ProfilesPage from '../pages/trombi';
import { usersApi } from './client';

export default createBrowserRouter([
  {
    path: '/',
    Component: MainLayout,
    children: [
      {
        Component: AuthGuard,
        children: [
          {
            Component: ProfileGuard,
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
                path: '/events',
                Component: CalendarPage,
              },
              {
                path: '/events/doodle',
                Component: DoodlePage,
              },
              {
                path: '/events/manage',
                Component: ManageEventsPage,
              },
              {
                path: '/events/add',
                Component: AddEventPage,
              },
              {
                path: '/events/:eventId/edit',
                Component: EditEventPage,
              },
              {
                path: '/files/:folderId?',
                Component: ListFilesPage,
              },
              {
                path: '/users',
                Component: ProfilesPage,
                loader: () => usersApi.listProfilesApiV1ProfilesGet(),
              },
            ],
          },
        ],
      },
    ],
  },
]);
