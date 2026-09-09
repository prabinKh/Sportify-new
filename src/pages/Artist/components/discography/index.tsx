import { FC, memo, useEffect, useMemo, useState } from 'react';

/* eslint-disable react-hooks/exhaustive-deps */
import { Space } from 'antd';
import Chip from '../../../../components/Chip';
import { GridItemList } from '../../../../components/Lists/list';

// Utils
import { orderBy } from 'lodash';
import { useTranslation } from 'react-i18next';
import { getAlbumDescription } from '../../../../utils/getDescription';

// Redux
import { useAppSelector } from '../../../../store/store';

const ChipsSection: FC<{ activeKey: string; setActiveKey: (str: string) => void }> = memo(
  (props) => {
    const [t] = useTranslation(['artist', 'playlist']);
    const { activeKey, setActiveKey } = props;

    const albums = useAppSelector((state) => state.artist.albums);
    const singles = useAppSelector((state) => state.artist.singles);
    const compilations = useAppSelector((state) => state.artist.compilations);
    const playlists = useAppSelector((state) => state.artist.playlists || []);

    const chips = useMemo(() => {
      if (!albums.length && !singles.length && !compilations.length && !playlists.length) {
        return [];
      }

      const items = ['Popular releases'];

      if (albums.length) {
        items.push('Albums');
      }
      if (singles.length) {
        items.push('Singles and EPs');
      }

      if (compilations.length) {
        items.push('Compilations');
      }

      if (playlists.length) {
        items.push('Playlists');
      }
      return items;
    }, [albums, singles, compilations, playlists]);

    useEffect(() => {
      if (chips.length) setActiveKey(chips[0]);
    }, [chips]);

    if (!chips.length || chips.length === 2) return null;

    return (
      <Space style={{ margin: '0px 15px', marginBottom: 15 }}>
        {chips.map((chip) => (
          <Chip
            key={chip}
            text={t(chip)}
            active={activeKey === chip}
            onClick={() => setActiveKey(chip)}
          />
        ))}
      </Space>
    );
  }
);

export const Discography = memo(() => {
  const [t] = useTranslation(['artist', 'playlist']);
  const artist = useAppSelector((state) => state.artist.artist);
  const albums = useAppSelector((state) => state.artist.albums);
  const singles = useAppSelector((state) => state.artist.singles);
  const compilations = useAppSelector((state) => state.artist.compilations);
  const playlists = useAppSelector((state) => state.artist.playlists || []);

  const [activeKey, setActiveKey] = useState('Popular releases');

  const items = useMemo(() => {
    switch (activeKey) {
      case 'Albums':
        return albums;
      case 'Singles and EPs':
        return singles;
      case 'Compilations':
        return compilations;
      case 'Playlists':
        return playlists;
      default:
        return orderBy([...albums, ...singles, ...compilations], 'release_date', 'desc');
    }
  }, [activeKey, albums, singles, compilations, playlists]);

  return (
    <div>
      <div>
        <GridItemList
          items={items}
          title={t('Discography')}
          getDescription={getAlbumDescription}
          moreUrl={`/artist/${artist!.id}/discography`}
          chips={<ChipsSection activeKey={activeKey} setActiveKey={setActiveKey} />}
        />
      </div>
    </div>
  );
});
