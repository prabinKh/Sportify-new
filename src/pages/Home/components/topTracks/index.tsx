import { HorizontalCard } from './horizontalCard';

// Redux
import { useAppSelector } from '../../../../store/store';

// Utils
import useIsMobile from '../../../../utils/isMobile';

// Interfaces
import type { FC } from 'react';

export const TopTracks: FC<{ setColor: (str: string) => void }> = (props) => {
  const isMobile = useIsMobile();
  const topTracks = useAppSelector((state) => state.home.topTracks);

  if (!topTracks || !topTracks.length) return null;

  const recentTracks = topTracks.slice(0, isMobile ? 4 : 6);

  return (
    <div className='home-top-tracks'>
      {recentTracks.map((item, index) => (
        <HorizontalCard key={`top-track-${item.id || index}-${index}`} item={item} setColor={props.setColor} />
      ))}
    </div>
  );
};
