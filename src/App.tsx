/* eslint-disable react-hooks/exhaustive-deps */
import './styles/App.scss';

// Utils
import i18next from 'i18next';
import { FC, Suspense, lazy, memo, useCallback, useEffect, useMemo, useRef } from 'react';

// Components
import { ConfigProvider } from 'antd';
import { AppLayout } from './components/Layout';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';

// Redux
import { Provider } from 'react-redux';
import { uiActions } from './store/slices/ui';
import { PersistGate } from 'redux-persist/integration/react';
import { authActions } from './store/slices/auth';
import { persistor, store, useAppDispatch, useAppSelector } from './store/store';

// Spotify
import { playerService } from './services/player';

// Pages
import SearchContainer from './pages/Search/Container';

const Home = lazy(() => import('./pages/Home'));
const Page404 = lazy(() => import('./pages/404'));
const AlbumView = lazy(() => import('./pages/Album'));
const GenrePage = lazy(() => import('./pages/Genre'));
const BrowsePage = lazy(() => import('./pages/Browse'));
const ArtistPage = lazy(() => import('./pages/Artist'));
const ArtistsPage = lazy(() => import('./pages/Artists'));
const PlaylistView = lazy(() => import('./pages/Playlist'));
const PlaylistsPage = lazy(() => import('./pages/Playlists'));
const ArtistDiscographyPage = lazy(() => import('./pages/Discography'));
const TrackPage = lazy(() => import('./pages/Track'));
const KaraokePage = lazy(() => import('./pages/Karaoke'));
const AuthPage = lazy(() => import('./pages/Auth'));
const RoomsPage = lazy(() => import('./pages/Rooms').then((m) => ({ default: m.RoomsPage })));
const RoomView = lazy(() => import('./pages/Rooms/RoomView').then((m) => ({ default: m.RoomView })));
const FriendsPage = lazy(() => import('./pages/Friends').then((m) => ({ default: m.FriendsPage })));
const MessagesPage = lazy(() => import('./pages/Messages').then((m) => ({ default: m.MessagesPage })));

const Profile = lazy(() => import('./pages/User/Home'));
const ProfileTracks = lazy(() => import('./pages/User/Songs'));
const ProfileArtists = lazy(() => import('./pages/User/Artists'));
const ProfilePlaylists = lazy(() => import('./pages/User/Playlists'));

const SearchPage = lazy(() => import('./pages/Search/Home'));
const SearchTracks = lazy(() => import('./pages/Search/Songs'));
const LikedSongsPage = lazy(() => import('./pages/LikedSongs'));
const SearchAlbums = lazy(() => import('./pages/Search/Albums'));
const SearchPlaylist = lazy(() => import('./pages/Search/Playlists'));
const SearchPageArtists = lazy(() => import('./pages/Search/Artists'));
const RecentlySearched = lazy(() => import('./pages/Search/RecentlySearched'));

window.addEventListener('resize', () => {
  const vh = window.innerWidth;
  if (vh < 950) {
    store.dispatch(uiActions.collapseLibrary());
  }
});

const SpotifyContainer: FC<{ children: any }> = memo(({ children }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(authActions.fetchUser());
  }, [dispatch]);

  return <>{children}</>;
});

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
    <div className='spinner-container'>
      <div className='sk-circle'>
        <div className='sk-circle1 sk-child' />
        <div className='sk-circle2 sk-child' />
        <div className='sk-circle3 sk-child' />
        <div className='sk-circle4 sk-child' />
        <div className='sk-circle5 sk-child' />
        <div className='sk-circle6 sk-child' />
        <div className='sk-circle7 sk-child' />
        <div className='sk-circle8 sk-child' />
        <div className='sk-circle9 sk-child' />
        <div className='sk-circle10 sk-child' />
        <div className='sk-circle11 sk-child' />
        <div className='sk-circle12 sk-child' />
      </div>
    </div>
  </div>
);

const RoutesComponent = memo(() => {
  const location = useLocation();
  const container = useRef<HTMLDivElement>(null);
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (container.current) {
      container.current.scrollTop = 0;
    }
  }, [location, container]);

  const routes = useMemo(
    () => [
      { path: '/', element: <Home container={container} />, public: true },
      { path: '', element: <Home container={container} />, public: true },
      { public: true, path: '/login', element: <AuthPage container={container} defaultMode='login' /> },
      { public: true, path: '/signup', element: <AuthPage container={container} defaultMode='register' /> },
      { public: true, path: '/register', element: <AuthPage container={container} defaultMode='register' /> },
      { public: true, path: '/rooms', element: <RoomsPage /> },
      { public: true, path: '/room/:code', element: <RoomView /> },
      { public: true, path: '/live-rooms', element: <RoomsPage /> },
      { public: false, path: '/friends', element: <FriendsPage /> },
      { public: false, path: '/messages', element: <MessagesPage /> },
      { public: false, path: '/messages/:userId', element: <MessagesPage /> },
      { public: true, path: '/collection/tracks', element: <LikedSongsPage container={container} /> },
      { public: true, path: '/playlist', element: <PlaylistsPage container={container} /> },
      { public: true, path: '/playlists', element: <PlaylistsPage container={container} /> },
      { public: true, path: '/playlist/:playlistId', element: <PlaylistView container={container} /> },
      { public: true, path: '/album/:albumId', element: <AlbumView container={container} /> },
      { public: true, path: '/track/:trackId', element: <TrackPage container={container} /> },
      { public: true, path: '/karaoke/:trackId', element: <KaraokePage container={container} /> },
      { public: true, path: '/artist/:artistId/discography', element: <ArtistDiscographyPage container={container} /> },
      { public: true, path: '/artist/:artistId', element: <ArtistPage container={container} /> },
      { public: true, path: '/artists', element: <ArtistsPage container={container} /> },
      { public: true, path: '/collection/artists', element: <ArtistsPage container={container} /> },
      { public: true, path: '/users/:userId/artists', element: <ArtistsPage container={container} /> },
      { public: true, path: '/users/:userId/playlists', element: <ProfilePlaylists container={container} /> },
      { public: true, path: '/users/:userId/tracks', element: <ProfileTracks container={container} /> },
      { public: true, path: '/users/:userId', element: <Profile container={container} /> },
      { public: true, path: '/genre/:genreId', element: <GenrePage /> },
      { public: true, path: '/search', element: <BrowsePage /> },
      { public: true, path: '/recent-searches', element: <RecentlySearched /> },
      {
        public: true,
        path: '/search/:search',
        element: <SearchContainer container={container} />,
        children: [
          { path: 'artists', element: <SearchPageArtists container={container} /> },
          { path: 'albums', element: <SearchAlbums container={container} /> },
          { path: 'playlists', element: <SearchPlaylist container={container} /> },
          { path: 'tracks', element: <SearchTracks container={container} /> },
          { path: '', element: <SearchPage container={container} /> },
        ],
      },
      { path: '*', element: <Page404 /> },
    ],
    [container]
  );

  return (
    <div
      className='Main-section'
      ref={container}
      style={{
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          minHeight: '100%',
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={route.element}
              >
                {route?.children
                  ? route.children.map((child) => (
                      <Route
                        key={child.path}
                        path={child.path}
                        element={child.element}
                      />
                    ))
                  : undefined}
              </Route>
            ))}
          </Routes>
        </Suspense>
      </div>
    </div>
  );
});

const RootComponent = () => {
  const user = useAppSelector((state) => !!state.auth.user);
  const language = useAppSelector((state) => state.language.language);
  const playing = useAppSelector((state) => !state.spotify.state?.paused);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    i18next.changeLanguage(language);
  }, [language]);

  const handleSpaceBar = useCallback(
    (e: KeyboardEvent) => {
      // @ts-ignore
      if (e.target?.tagName?.toUpperCase() === 'INPUT') return;
      if (playing === undefined) return;
      e.stopPropagation();
      if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
        e.preventDefault();
        const request = !playing ? playerService.startPlayback() : playerService.pausePlayback();
        request.then().catch(() => {});
      }
    },
    [playing]
  );

  useEffect(() => {
    if (!user) return;
    document.addEventListener('keydown', handleSpaceBar);
    return () => {
      document.removeEventListener('keydown', handleSpaceBar);
    };
  }, [user, handleSpaceBar]);

  useEffect(() => {
    if (!user) return;
    const handleContextMenu = (e: any) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('keydown', handleContextMenu);
    };
  }, [user]);

  return (
    <Router>
      <AppLayout>
        <RoutesComponent />
      </AppLayout>
    </Router>
  );
};

function App() {
  return (
    <ConfigProvider theme={{ token: { fontFamily: 'SpotifyMixUI' } }}>
      <Provider store={store}>
        <PersistGate loading={<LoadingFallback />} persistor={persistor}>
          <SpotifyContainer>
            <RootComponent />
          </SpotifyContainer>
        </PersistGate>
      </Provider>
    </ConfigProvider>
  );
}

export default App;
