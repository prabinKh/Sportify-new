import { FC, RefObject, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../../../store/store';
import { DEFAULT_PAGE_COLOR } from '../../../../constants/spotify';
import UserHoverableMenu from './scrollHoverable';
import { getImageAnalysis2 } from '../../../../utils/imageAnyliser';
import tinycolor from 'tinycolor2';
import { UserHeader } from './header';
import { MyArtistsSection } from '../components/artists';
import { MyPlaylistsSection } from '../components/playlists';
import { Songs } from '../components/songs';

interface ProfilePageProps {
  container: RefObject<HTMLDivElement | null>;
}

export const ProfileContainer: FC<ProfilePageProps> = (props) => {
  const profileUser = useAppSelector((state) => state.profile.user);
  const authUser = useAppSelector((state) => state.auth.user);
  const user = profileUser || authUser;

  const ref = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState<string>(DEFAULT_PAGE_COLOR);

  useEffect(() => {
    const imgUrl = user?.images?.[0]?.url || (user as any)?.avatar_url;
    if (imgUrl) {
      getImageAnalysis2(imgUrl)
        .then((c) => {
          let col = tinycolor(c);
          if (!col.isValid()) {
            col = tinycolor(DEFAULT_PAGE_COLOR);
          }
          let safety = 0;
          while (col.isLight() && safety < 8) {
            col = col.darken(10);
            safety++;
          }
          setColor(col.darken(20).toHexString());
        })
        .catch(() => {
          setColor(DEFAULT_PAGE_COLOR);
        });
    } else {
      setColor(DEFAULT_PAGE_COLOR);
    }
  }, [user]);

  return (
    <div className='Profile-section' ref={ref}>
      <UserHoverableMenu color={color} container={props.container} sectionContainer={ref} />
      <UserHeader color={color} />

      <div
        style={{
          maxHeight: 323,
          padding: '20px 15px',
          background: `linear-gradient(${color} -50%, ${DEFAULT_PAGE_COLOR} 90%)`,
        }}
      >
        <MyArtistsSection />

        <Songs />

        <MyPlaylistsSection />
      </div>
    </div>
  );
};

export default ProfileContainer;
