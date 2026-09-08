import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../../store/store';
import { HomeItemList } from '../HomeItemList';
import type { FC } from 'react';

export const PopularArtists: FC = () => {
  const { t } = useTranslation(['home']);
  const artists = useAppSelector((state) => state.home.artists);

  if (!artists || !artists.length) return null;

  return (
    <div className='home'>
      <HomeItemList
        title={t('Popular artists')}
        moreUrl='/artists'
        items={artists}
      />
    </div>
  );
};
