import { Col, Row, Space } from 'antd';
import { memo, useState } from 'react';
import HistoryNavigation from './HistoryNavigation';
import Header from './Header';
import { Search } from './Search';
import NavbarQuickLinks from './NavbarQuickLinks';
import MobileNavDrawer from './MobileNavDrawer';
import useIsMobile from '../../../../utils/isMobile';
import { FaBars, FaUser } from 'react-icons/fa6';
import { useAppSelector } from '../../../../store/store';

export const Navbar = memo(() => {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = Boolean(user && user.id && user.id !== 'guest');

  return (
    <>
      <Row
        align='middle'
        gutter={[12, 0]}
        className='navbar'
        justify='space-between'
        wrap={false}
      >
        {/* App Logo & History on Desktop / Tablet */}
        <Col flex='none' className='mobile-hidden'>
          <HistoryNavigation />
        </Col>

        {/* Search Bar */}
        <Col flex='1 1 auto' style={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'center', minWidth: 0 }}>
          <Search hideHomeButton={isMobile} />
        </Col>

        {/* Mobile Toggle Button */}
        {isMobile && (
          <Col flex='none'>
            <button
              type='button'
              onClick={() => setMobileMenuOpen(true)}
              className={`mobile-nav-toggle-btn ${mobileMenuOpen ? 'is-active' : ''}`}
              aria-label='Open navigation menu'
              aria-expanded={mobileMenuOpen}
            >
              {isAuthenticated && user?.images?.[0]?.url ? (
                <div className='mobile-toggle-avatar'>
                  <img src={user.images[0].url} alt={user.display_name || 'Profile'} />
                </div>
              ) : isAuthenticated ? (
                <FaUser size={16} />
              ) : (
                <FaBars size={18} />
              )}
              {isAuthenticated && <span className='mobile-toggle-badge' />}
            </button>
          </Col>
        )}

        {/* Desktop Quick Links & Header Dropdown */}
        {!isMobile && (
          <Col flex='none' className='mobile-hidden'>
            <Space size={14} align='center'>
              <NavbarQuickLinks />
              <Header opacity={1} />
            </Space>
          </Col>
        )}
      </Row>

      {/* Render Portal Drawer for Mobile Navigation */}
      <MobileNavDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
});

Navbar.displayName = 'Navbar';
export default Navbar;

