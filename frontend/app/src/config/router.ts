import { createBrowserRouter } from 'react-router-dom';
import AuthGuard from '../layout/auth';
import MainLayout from '../layout/main';
import AddEventPage from '../pages/events/add';
import CalendarPage from '../pages/events/calendar';
import DoodlePage from '../pages/events/doodle';
import ListFilesPage from '../pages/files/list';
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
        ],
      },
    ],
  },
]);
