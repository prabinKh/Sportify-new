import SongDetails from './SongDetails';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { Col, Row } from 'antd';
import { ListIcon } from '../../../Icons';

// Redux
import { useEffect, useState } from 'react';
import { getImageAnalysis2 } from '../../../../utils/imageAnyliser';
import { uiActions } from '../../../../store/slices/ui';
import tinycolor from 'tinycolor2';
import { AddSongToLibraryButton } from '../../../Actions/AddSongToLibrary';
import { spotifyActions } from '../../../../store/slices/spotify';
import ControlButtons from './ControlButtons';

const QueueButton = () => {
  const dispatch = useAppDispatch();
  return (
    <button onClick={() => dispatch(uiActions.toggleQueue())}>
      <ListIcon />
    </button>
  );
};

const NowPlayingBarMobile = () => {
  const dispatch = useAppDispatch();
  const position = useAppSelector((state) => state.spotify.state?.position || 0);
  const duration = useAppSelector((state) => state.spotify.state?.duration || 1);
  const currentSong = useAppSelector(
    (state) => state.spotify.state?.track_window.current_track,
    (a, b) => a?.id === b?.id
  );
  const liked = useAppSelector((state) => state.spotify.liked);
  const [currentColor, setColor] = useState('blue');

  useEffect(() => {
    if (currentSong) {
      getImageAnalysis2(currentSong.album.images[0].url).then((r) => {
        let color = tinycolor(r);
        while (color.isLight()) {
          color = color.darken(10);
        }
        setColor(color.toHexString());
      });
    }
  }, [currentSong]);

  if (!currentSong) return <div></div>;

  return (
    <div>
      <div
        className='mobile-player'
        style={{ 
          background: `linear-gradient(${currentColor} -50%, rgb(18, 18, 18) 300%)`,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <Row justify='space-between' align='middle'>
          <Col>
            <SongDetails isMobile />
          </Col>
          <Col style={{ display: 'flex' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginRight: 5,
                gap: 15,
              }}
            >
              <AddSongToLibraryButton
                size={17}
                isSaved={liked}
                id={currentSong?.id!}
                onToggle={() => {
                  dispatch(spotifyActions.setLiked({ liked: !liked }));
                }}
              />
              <QueueButton />
            </div>
          </Col>
        </Row>

        <Row justify='center'>
          <div style={{ transform: 'scale(0.9)' }}>
            <ControlButtons />
          </div>
        </Row>

        <div className='time-line' style={{ marginTop: 5 }}>
          <div
            className='current-time'
            style={{
              width: `${(position / duration) * 100}%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default NowPlayingBarMobile;
