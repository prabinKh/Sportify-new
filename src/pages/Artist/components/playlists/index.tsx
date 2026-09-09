import { memo } from 'react';

// Components
import { GridItemList } from '../../../../components/Lists/list';

// Redux
import { useAppSelector } from '../../../../store/store';

// Utils
import { useTranslation } from 'react-i18next';

export const ArtistPlaylists = memo(() => {
  const [t] = useTranslation(['artist', 'playlist']);
  const playlists = useAppSelector((state) => state.artist.playlists || []);

  if (!playlists.length) {
    return null;
  }

  return (
    <div style={{ marginTop: 28, marginBottom: 28 }}>
      <GridItemList items={playlists} title={t('Playlists')} />
    </div>
  );
});

export default ArtistPlaylists;
