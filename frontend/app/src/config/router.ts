import { createBrowserRouter } from 'react-router-dom';
import AuthGuard from '../layout/auth';
import MainLayout from '../layout/main';
import AddEventPage from '../pages/events/add';
import CalendarPage from '../pages/events/calendar';
import DoodlePage from '../pages/events/doodle';
import ListFilesPage from '../pages/files/list';
import HomePage from '../pages/home';
import EditProfilePage from '../pages/profiles/edit';
import MyProfile from '../pages/profiles/me';
import ProfilesPage from '../pages/profiles/trombi';

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
            path: '/events',
            Component: CalendarPage,
          },
          {
            path: '/events/doodle',
            Component: DoodlePage,
          },
          {
            path: '/events/add',
            Component: AddEventPage,
          },
          {
            path: '/files/:folderId?',
            Component: ListFilesPage,
          },
          {
            path: '/users',
            Component: ProfilesPage,
          },
          {
            path: '/profile',
            Component: MyProfile,
          },
          {
            path: '/profile/edit',
            Component: EditProfilePage,
          },
        ],
      },
    ],
  },
]);
