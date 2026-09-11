import { Col, Row, Space } from 'antd';
import { memo, useState, useRef, useEffect } from 'react';
import HistoryNavigation from './HistoryNavigation';
import Header from './Header';
import { Search } from './Search';
import NavbarQuickLinks from './NavbarQuickLinks';
import useIsMobile from '../../../../utils/isMobile';
import { FaBars } from 'react-icons/fa6';

export const Navbar = memo(() => {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <Row
      align='middle'
      gutter={[12, 12]}
      className='navbar'
      justify='space-between'
      style={{ marginLeft: 5, marginRight: 5, flexWrap: 'wrap' }}
    >
      <Col flex='none' className='mobile-hidden tablet-hidden'>
        <HistoryNavigation />
      </Col>

      <Col xs={20} md={8} lg={9} xl={8} style={{ textAlign: 'center' }}>
        <Search />
      </Col>

      {/* Hamburger Menu on Mobile */}
      {isMobile && (
        <Col xs={4} style={{ textAlign: 'right' }} ref={dropdownRef}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '8px',
              marginTop: '2px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: mobileMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              boxShadow: mobileMenuOpen ? '0 0 15px rgba(29, 185, 84, 0.4)' : 'none',
            }}
            aria-label="Open navigation menu"
          >
            <FaBars />
          </button>
          
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 15px)',
              right: '5px', /* Align with the right edge */
              width: '260px', /* Fixed width instead of left:0 right:0 */
              background: 'rgba(20, 20, 20, 0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: '24px 20px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              zIndex: 1500,
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              marginTop: '10px',
              opacity: mobileMenuOpen ? 1 : 0,
              visibility: mobileMenuOpen ? 'visible' : 'hidden',
              transform: mobileMenuOpen ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
              transformOrigin: 'top right',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          >
            <div style={{
              transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(20px)',
              opacity: mobileMenuOpen ? 1 : 0,
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.1s',
            }}>
              <NavbarQuickLinks isMobile={true} />
            </div>
            
            <div style={{
              alignSelf: 'flex-start',
              width: '100%',
              transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(20px)',
              opacity: mobileMenuOpen ? 1 : 0,
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s',
            }}>
              <Header opacity={1} isMobile={true} />
            </div>
          </div>
        </Col>
      )}

      {/* Desktop Links */}
      {!isMobile && (
        <Col flex='none' className='mobile-hidden'>
          <Space size={14} align='center'>
            <NavbarQuickLinks />
            <Header opacity={1} />
          </Space>
        </Col>
      )}
    </Row>
  );
});
