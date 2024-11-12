import { createBrowserRouter } from 'react-router-dom';
import AuthGuard from '../guards/auth';
import MyAuthProvider from '../layout/auth-provider';
import MainLayout from '../layout/main';
import { SimpleLayoutWithOutlet } from '../layout/simple';
import RoutingErrorComponent from '../pages/error/error';
import AddEventPage from '../pages/events/add';
import AnswerLinkPage from '../pages/events/answer';
import CalendarPage from '../pages/events/calendar';
import DoodlePage from '../pages/events/doodle';
import EditEventPage from '../pages/events/edit';
import EventsManagePage from '../pages/events/events';
import ListFilesPage from '../pages/files/list';
import AddGroupPage from '../pages/groups/add';
import EditGroupPage from '../pages/groups/edit';
import GroupPage from '../pages/groups/group';
import GroupListPage from '../pages/groups/list';
import HomePage from '../pages/home/home';
import AlbumsPage from '../pages/photos';
import CreateProfilePage from '../pages/profiles/add';
import EditProfilePage from '../pages/profiles/edit';
import ProfilesPage from '../pages/profiles/list';
import ShowMyProfilePage from '../pages/profiles/me';
import ShowProfilePage from '../pages/profiles/show';
import Empty from '../utils/empty';

export default createBrowserRouter([
  {
    path: '/',
    Component: MyAuthProvider,
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
                Component: HomePage,
              },
              {
                path: '/events',
                Component: DoodlePage,
              },
              {
                path: '/events/manage',
                Component: EventsManagePage,
              },
              {
                path: '/events/calendar',
                Component: CalendarPage,
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
                path: '/profile',
                Component: ProfilesPage,
              },
              {
                path: '/profile/me',
                Component: ShowMyProfilePage,
              },
              {
                path: '/profile/:profileId',
                Component: ShowProfilePage,
              },
              {
                path: '/profile/edit/:profileId',
                Component: EditProfilePage,
              },
              {
                path: '/profile/add',
                Component: CreateProfilePage,
              },
              {
                path: '/groups',
                Component: GroupListPage,
              },
              {
                path: '/groups/:groupId',
                Component: GroupPage,
              },
              {
                path: '/groups/add',
                Component: AddGroupPage,
              },
              {
                path: '/groups/edit/:groupId',
                Component: EditGroupPage,
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
        Component: SimpleLayoutWithOutlet,
        children: [
          {
            path: 'answer/:token',
            Component: AnswerLinkPage,
          },
        ],
      },
      {
        path: '/callback',
        Component: Empty,
      },
    ],
  },
]);
