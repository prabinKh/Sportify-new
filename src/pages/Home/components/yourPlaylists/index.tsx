import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../../store/store';

import { memo, useMemo, type FC } from 'react';

import { HomeItemList } from '../HomeItemList';

interface NewReleasesProps {}

export const YourPlaylists: FC<NewReleasesProps> = memo(() => {
  const { t } = useTranslation(['home']);
  const user = useAppSelector((state) => state.auth.user?.id);
  const playlists = useAppSelector((state) => state.yourLibrary.myPlaylists);
  const featurePlaylists = useAppSelector((state) => state.home.featurePlaylists);

  const items = useMemo(() => {
    const userPlaylists = playlists.filter((p) => p.owner?.id === user);
    if (userPlaylists.length > 0) {
      return userPlaylists.slice(0, 12);
    }
    return (playlists.length > 0 ? playlists : featurePlaylists).slice(0, 12);
  }, [playlists, user, featurePlaylists]);

  if (!items || !items.length) return null;

  return (
    <div className='home'>
      <HomeItemList items={items} title={`${t('Your playlists')}`} />
    </div>
  );
});
