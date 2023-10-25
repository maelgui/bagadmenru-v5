import { createBrowserRouter } from 'react-router-dom';
import AuthGuard from '../layout/auth';
import MainLayout from '../layout/main';
import SimpleLayout from '../layout/simple';
import RoutingErrorComponent from '../pages/error/error';
import AddEventPage from '../pages/events/add';
import AnswerLinkPage from '../pages/events/answer';
import CalendarPage from '../pages/events/calendar';
import DoodlePage from '../pages/events/doodle';
import EditEventPage from '../pages/events/edit';
import EventsManagePage from '../pages/events/events';
import ListFilesPage from '../pages/files/list';
import HomePage from '../pages/home';
import AlbumsPage from '../pages/photos';
import EditProfilePage from '../pages/profiles/edit';
import MyProfile from '../pages/profiles/me';
import ProfilesPage from '../pages/profiles/trombi';

export default createBrowserRouter([
  {
    path: '/',
    ErrorBoundary: RoutingErrorComponent,
    children: [
      {
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
                path: '/events/manage',
                Component: EventsManagePage,
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
                path: '/events/edit/:eventId',
                Component: EditEventPage,
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
              {
                path: '/photos',
                Component: AlbumsPage,
              },
            ],
          },
        ],
      },
      {
        path: '/s/',
        Component: SimpleLayout,
        children: [
          {
            path: 'answer',
            Component: AnswerLinkPage,
          },
        ],
      },
    ],
  },
]);
