import { memo, useMemo, useState } from 'react';

import TopSong from './song';
import { Col, Row } from 'antd';

// Redux
import { useAppSelector } from '../../../../store/store';
import { sortTracksByLatestDownload } from '../../../../services/artist';

// Utils
import { useTranslation } from 'react-i18next';

export const ArtistTopTracks = memo(() => {
  const [t] = useTranslation(['artist']);
  const [showAll, setShowAll] = useState(false);
  const topSongs = useAppSelector((state) => state.artist.topTracks);

  const sortedSongs = useMemo(() => {
    return sortTracksByLatestDownload(topSongs);
  }, [topSongs]);

  const items = useMemo(() => {
    if (showAll) {
      return sortedSongs;
    }
    return sortedSongs.slice(0, 5);
  }, [showAll, sortedSongs]);

  if (!topSongs.length) {
    return null;
  }

  return (
    <div style={{ margin: 10 }}>
      <h1 className='playlist-header'>{t('Popular')}</h1>
      <Row>
        <Col span={24}>
          <div>
            {items.map((song, index) => (
              <TopSong key={song.uri} song={song} index={index} />
            ))}
          </div>
        </Col>
      </Row>
      <button className='showMore' onClick={() => setShowAll((s) => !s)}>
        <span>{showAll ? t('Show less') : t('Show more')}</span>
      </button>
    </div>
  );
});
