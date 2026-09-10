// Components
import { Col } from 'antd';
import { LibraryTitle } from '../Title';
import { ListItemComponent } from './ListCards';
import { CompactItemComponent } from './CompactCards';
import { LibraryFilters, SearchArea } from '../Filters';
import { FaMicrophone } from 'react-icons/fa6';

// Redux
import { useAppDispatch, useAppSelector } from '../../../../../store/store';
import { getLibraryItems } from '../../../../../store/slices/yourLibrary';
import { useNavigate } from 'react-router-dom';
import { GridItemComponent } from '../../../../Lists/list';
import { memo, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isActiveOnOtherDevice } from '../../../../../store/slices/spotify';
import useIsMobile from '../../../../../utils/isMobile';
import { getLibraryCollapsed, uiActions } from '../../../../../store/slices/ui';
import { LanguageButton } from '../Language';
import { LibraryLoginInfo } from './loginInfo';

const COLLAPSED_STYLE = {
  overflowY: 'scroll',
  height: '100%',
} as const;

const YourLibrary = () => {
  const collapsed = useAppSelector(getLibraryCollapsed);
  const user = useAppSelector((state) => !!state.auth.user);
  const activeOnOtherDevice = useAppSelector(isActiveOnOtherDevice);

  const heightValue = useMemo(() => {
    let value = 275;
    if (!user) value = 270;
    if (collapsed) value = 270;
    if (activeOnOtherDevice) value += 50;
    return value;
  }, [user, collapsed, activeOnOtherDevice]);

  return (
    <div className={`Navigation-section library ${!collapsed ? 'open' : ''}`}>
      <LibraryTitle />

      {!collapsed && user ? <LibraryFilters /> : null}

      <div className='library-list-container'>
        <Col style={collapsed ? {} : COLLAPSED_STYLE}>
          <div
            className='library-list'
            id='library-list-scrollable'
            style={{
              overflowY: 'scroll',
              overflowX: 'hidden',
              height: `calc(100vh - ${heightValue}px`,
            }}
          >
            {!user ? <AnonymousContent /> : <LoggedContent />}
          </div>

          {!user ? (
            <div style={{ marginLeft: 10 }}>
              <LanguageButton />
            </div>
          ) : null}
        </Col>
      </div>
    </div>
  );
};

const AnonymousContent = () => {
  return <LibraryLoginInfo />;
};

const LoggedContent = memo(() => {
  const isMobile = useIsMobile();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const items = useAppSelector(getLibraryItems);
  const collapsed = useAppSelector(getLibraryCollapsed);
  const view = useAppSelector((state) => state.yourLibrary.view);
  const search = useAppSelector((state) => state.yourLibrary.search);
  const filter = useAppSelector((state) => state.yourLibrary.filter);
  const [t] = useTranslation(['navbar']);

  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    setVisibleCount(30);
  }, [search, filter, items.length]);

  useEffect(() => {
    const scrollContainer = document.getElementById('library-list-scrollable');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (scrollHeight - scrollTop - clientHeight < 150) {
        setVisibleCount((prev) => Math.min(prev + 30, items.length));
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [items.length]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasNoSearchResults = Boolean(search.trim()) && items.length === 0;

  if (filter === 'ARTISTS' && items.length === 0 && !search.trim()) {
    return (
      <>
        {!collapsed ? <SearchArea /> : null}
        <div style={{ padding: '28px 16px', textAlign: 'center', color: '#b3b3b3' }}>
          <FaMicrophone size={26} style={{ color: '#535353', marginBottom: 10 }} />
          <p style={{ fontWeight: 600, color: '#ffffff', fontSize: '14px', marginBottom: '6px' }}>
            No followed artists yet
          </p>
          <p style={{ fontSize: '12px', lineHeight: '1.4', marginBottom: '14px' }}>
            Follow your favorite artists to easily find them here.
          </p>
          <button
            onClick={() => navigate('/artists')}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              background: '#ffffff',
              color: '#000000',
              fontWeight: 700,
              fontSize: '12px',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Explore Artists
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {!collapsed ? <SearchArea /> : null}

      {hasNoSearchResults ? (
        <div className='library-search-empty'>
          <h3>
            {t("Couldn't find")} “{search.trim()}”
          </h3>
          <p>{t('Try searching again using a different spelling or keyword.')}</p>
        </div>
      ) : (
        <div
          className={`${collapsed ? 'collapsed' : ''} ${
            !collapsed && view === 'GRID' ? 'grid-view' : ''
          }`}
        >
          {visibleItems.map((item) => {
            const itemKey = `${item.type || 'item'}-${item.id}`;
            if (collapsed) return <ListItemComponent key={itemKey} item={item} />;

            return (
              <div
                key={itemKey}
                onClick={isMobile ? () => dispatch(uiActions.collapseLibrary()) : undefined}
              >
                {view === 'LIST' ? <ListItemComponent key={itemKey} item={item} /> : ''}
                {view === 'COMPACT' ? <CompactItemComponent key={itemKey} item={item} /> : ''}
                {view === 'GRID' ? <GridItemComponent key={itemKey} item={item} /> : ''}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
});

export default YourLibrary;
