import { FC, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Components
import { GridItemList } from '../../../../components/Lists/list';

// Redux
import { useAppSelector } from '../../../../store/store';

export const OtherAlbums: FC = memo(() => {
  const { t } = useTranslation(['album']);

  const artist = useAppSelector((state) => state.album.artist);
  const current = useAppSelector((state) => state.album.album);
  const otherAlbums = useAppSelector((state) => state.album.otherAlbums);

  const items = useMemo(() => {
    const list = otherAlbums || [];
    if (current) {
      return list.filter((album) => album && album.id !== current.id);
    }
    return list;
  }, [current, otherAlbums]);

  if (!items || items.length === 0) return null;

  return <GridItemList title={`${t('More by')} ${artist?.name || 'Artist'}`} items={items} />;
});
