import { Col, Row, Space } from 'antd';
import { memo } from 'react';
import HistoryNavigation from './HistoryNavigation';
import Header from './Header';
import { Search } from './Search';
import NavbarQuickLinks from './NavbarQuickLinks';

export const Navbar = memo(() => {
  return (
    <Row
      align='middle'
      gutter={[12, 12]}
      className='navbar'
      justify='space-between'
      style={{ marginLeft: 5, marginRight: 5, flexWrap: 'nowrap' }}
    >
      <Col flex='none'>
        <HistoryNavigation />
      </Col>

      <Col span={0} md={8} lg={9} xl={8} style={{ textAlign: 'center' }}>
        <Search />
      </Col>

      <Col flex='none'>
        <Space size={14} align='center'>
          <NavbarQuickLinks />
          <Header opacity={1} />
        </Space>
      </Col>
    </Row>
  );
});
