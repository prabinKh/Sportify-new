import React, { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, SearchIcon, LibraryIcon } from '../Icons';
import '../../styles/MobileBottomNav.scss';

export const MobileBottomNav = memo(() => {
  return (
    <nav className="mobile-bottom-nav mobile-flex">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <HomeIcon />
        <span>Home</span>
      </NavLink>
      <NavLink to="/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <SearchIcon />
        <span>Search</span>
      </NavLink>
      <NavLink to="/collection/playlists" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <LibraryIcon />
        <span>Your Library</span>
      </NavLink>
    </nav>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';
