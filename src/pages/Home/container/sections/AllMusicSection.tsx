import { Col } from 'antd';
import { memo, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import { PopularArtists } from '../../components/popularArtists';
import { FavouriteArtists } from '../../components/favouriteArtists';
import { FeaturePlaylists } from '../../components/featurePlaylists';
import { MadeForYou } from '../../components/madeForYou';
import { MoreLikeArtistSection } from '../../components/moreLikeArtists/MoreLikeArtistSection';
import { NewReleases } from '../../components/newReleases';
import { RecentlyPlayed } from '../../components/recentlyPlayed';
import { Rankings } from '../../components/rankings';
import { TopMixes } from '../../components/topMixes';
import { TopTracks } from '../../components/topTracks';
import { Trending } from '../../components/trending';
import { YourPlaylists } from '../../components/yourPlaylists';
import { useAppSelector } from '../../../../store/store';

interface HomeAllMusicSectionProps {
  setColor: Dispatch<SetStateAction<string>>;
}

const LazySection = memo(({ children }: { children: ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) return;
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isVisible]);

  return <div ref={ref} style={{ minHeight: isVisible ? undefined : 40 }}>{isVisible ? children : null}</div>;
});

const MoreLikeArtistCol = memo(({ index }: { index: number }) => {
  const user = useAppSelector((state) => !!state.auth.user);
  const section = useAppSelector((state) => state.home.moreLikeArtists[index]);

  if (!user || !section) {
    return null;
  }

  return (
    <Col span={24}>
      <MoreLikeArtistSection section={section} />
    </Col>
  );
});

export const HomeAllMusicSection = memo(({ setColor }: HomeAllMusicSectionProps) => {
  const user = useAppSelector((state) => !!state.auth.user);
  const section = useAppSelector((state) => state.home.section);
  const topTracks = useAppSelector((state) => state.home.topTracks);
  const madeForYou = useAppSelector((state) => state.home.madeForYou);
  const recentlyPlayed = useAppSelector((state) => state.home.recentlyPlayed);

  const hasTopTracks = !!topTracks?.length;
  const hasMadeForYou = !!madeForYou?.length;
  const hasRecentlyPlayed = !!recentlyPlayed?.length;
  const hasTopMixes = !!madeForYou?.some((p) => p.name?.toLowerCase().includes('mix'));

  return (
    <>
      {user && hasTopTracks ? (
        <Col span={24}>
          <TopTracks setColor={setColor} />
        </Col>
      ) : null}

      <Col span={24}>
        <PopularArtists />
      </Col>

      {user && hasMadeForYou ? (
        <Col span={24}>
          <MadeForYou />
        </Col>
      ) : null}

      {user && hasRecentlyPlayed ? (
        <Col span={24}>
          <RecentlyPlayed />
        </Col>
      ) : null}

      {user && hasTopMixes ? (
        <Col span={24}>
          <TopMixes />
        </Col>
      ) : null}

      <MoreLikeArtistCol index={0} />

      <MoreLikeArtistCol index={1} />

      <Col span={24}>
        <LazySection>
          <FeaturePlaylists />
        </LazySection>
      </Col>

      <MoreLikeArtistCol index={2} />

      {user ? (
        <Col span={24}>
          <YourPlaylists />
        </Col>
      ) : null}

      <Col span={24}>
        <LazySection>
          <NewReleases />
        </LazySection>
      </Col>

      {!user || section === 'MUSIC' ? (
        <Col span={24}>
          <LazySection>
            <Rankings />
          </LazySection>
        </Col>
      ) : null}

      <MoreLikeArtistCol index={3} />

      {!user || section === 'MUSIC' ? (
        <Col span={24}>
          <LazySection>
            <Trending />
          </LazySection>
        </Col>
      ) : null}

      {user && section === 'ALL' ? (
        <Col span={24}>
          <LazySection>
            <FavouriteArtists />
          </LazySection>
        </Col>
      ) : null}
    </>
  );
});
