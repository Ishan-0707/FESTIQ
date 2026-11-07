import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Sun,
  Moon,
  UserCheck,
  ChevronDown,
  User,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  Home,
  Compass,
  Calendar as CalendarIcon,
  Image as GalleryIcon,
  Info
} from 'lucide-react';
import Button from '../ui/Button';
import FestiqLogo from '../common/FestiqLogo';
import { useAuth } from '../../context/AuthContext';
import './TopBar.css';

export default function TopBar({
  currentTheme,
  onToggleTheme,
  onOpenAuthModal,
  onOpenProfileModal
}) {
  const isLight = currentTheme === 'light';
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isManager = Boolean(user && (user.role === 'manager' || user.role === 'admin'));

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileDrawerRef = useRef(null);

  // Close profile dropdown on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setMobileDrawerOpen(false);
      }
    };

    if (dropdownOpen || mobileDrawerOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen, mobileDrawerOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMobileDrawerOpen(false);
    await logout();
  };

  // Canonical navigation items
  const navItems = [
    { path: '/', label: 'Home', icon: Home, end: true },
    { path: '/events', label: 'Explore Events', icon: Compass },
    { path: '/calendar', label: 'Calendar', icon: CalendarIcon },
    { path: '/gallery', label: 'Gallery', icon: GalleryIcon },
    { path: '/about', label: 'About', icon: Info },
    ...(isAuthenticated ? [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
    ...(isManager ? [{ path: '/manage', label: 'Management', icon: ShieldCheck, isRole: true }] : [])
  ];

  return (
    <>
      <header className="festiq-topbar" aria-label="Main Navigation Bar">
        <div className="topbar-viewport-grid">
          {/* Left Column: Campus Crest Brand Lockup */}
          <div className="topbar-left-zone">
            <Link
              to="/"
              className="topbar-brand-link"
              aria-label="FESTIQ Home - Campus Events Platform"
            >
              <FestiqLogo
                variant="full"
                size="md"
                showTagline={true}
                tagline="Campus Events"
              />
            </Link>
          </div>

          {/* Center Column: Viewport-Centered Navigation Links (Desktop) */}
          <nav className="topbar-center-nav" aria-label="Primary Navigation">
            <ul className="topbar-nav-list">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <li key={item.path} className="topbar-nav-item">
                    <NavLink
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) =>
                        `topbar-nav-link ${isActive ? 'active' : ''} ${item.isRole ? 'role-link' : ''}`
                      }
                    >
                      <IconComponent size={16} className="nav-item-icon" />
                      <span className="nav-item-label">{item.label}</span>
                      {item.isRole && <span className="nav-role-badge">Staff</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right Column: Theme Toggle, User Profile / Auth, and Mobile Toggle */}
          <div className="topbar-right-zone">
            {/* Theme Toggle Button */}
            <button
              type="button"
              className="topbar-theme-toggle"
              onClick={onToggleTheme}
              aria-label={isLight ? 'Switch to Dark Theme (Midnight Forest)' : 'Switch to Light Theme (Academic Blue)'}
              title={isLight ? 'Switch to Dark Theme (Midnight Forest)' : 'Switch to Light Theme (Academic Blue)'}
            >
              <span className="theme-toggle-icon-wrap">
                {isLight ? (
                  <Moon size={16} className="theme-icon moon-icon" />
                ) : (
                  <Sun size={16} className="theme-icon sun-icon" />
                )}
              </span>
              <span className="theme-toggle-text">{isLight ? 'Dark' : 'Light'}</span>
            </button>

            {/* Authentication Control */}
            {!isAuthenticated ? (
              <Button
                variant="primary"
                size="sm"
                icon={<UserCheck size={15} />}
                iconPosition="left"
                onClick={onOpenAuthModal}
                className="topbar-auth-btn"
              >
                Login / Sign Up
              </Button>
            ) : (
              <div className="topbar-user-menu" ref={dropdownRef}>
                <button
                  type="button"
                  className={`user-pill-btn ${dropdownOpen ? 'active' : ''}`}
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  aria-label={`User account options for ${user?.fullName || 'Student'}`}
                >
                  <div className="user-pill-avatar">
                    {getInitials(user?.fullName)}
                  </div>
                  <span className="user-pill-name">
                    {user?.fullName?.split(' ')[0] || 'Student'}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`user-pill-chevron ${dropdownOpen ? 'rotated' : ''}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="user-dropdown-panel" role="menu">
                    <div className="dropdown-user-header">
                      <div className="dropdown-user-avatar">
                        {getInitials(user?.fullName)}
                      </div>
                      <div className="dropdown-user-info">
                        <span className="dropdown-user-name">{user?.fullName}</span>
                        <span className="dropdown-user-email">{user?.email}</span>
                        <span className="dropdown-user-role">
                          {isManager ? 'Campus Event Manager' : 'Verified Student'}
                        </span>
                      </div>
                    </div>

                    <div className="dropdown-divider" />

                    <button
                      type="button"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/dashboard');
                      }}
                    >
                      <LayoutDashboard size={15} className="dropdown-item-icon" />
                      <span>Student Dashboard</span>
                    </button>

                    <button
                      type="button"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenProfileModal();
                      }}
                    >
                      <User size={15} className="dropdown-item-icon" />
                      <span>My Profile</span>
                    </button>

                    {isManager && (
                      <button
                        type="button"
                        className="dropdown-item dropdown-manager-item"
                        role="menuitem"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/manage');
                        }}
                      >
                        <ShieldCheck size={15} className="dropdown-item-icon" />
                        <span>Management Portal</span>
                      </button>
                    )}

                    <div className="dropdown-divider" />

                    <button
                      type="button"
                      className="dropdown-item dropdown-logout-item"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      <LogOut size={15} className="dropdown-item-icon" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="topbar-hamburger-btn"
              onClick={() => setMobileDrawerOpen((prev) => !prev)}
              aria-label={mobileDrawerOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileDrawerOpen}
            >
              {mobileDrawerOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer & Backdrop */}
      <div
        className={`mobile-nav-backdrop ${mobileDrawerOpen ? 'active' : ''}`}
        onClick={() => setMobileDrawerOpen(false)}
        aria-hidden={!mobileDrawerOpen}
      />

      <aside
        ref={mobileDrawerRef}
        className={`mobile-nav-drawer ${mobileDrawerOpen ? 'open' : ''}`}
        aria-label="Mobile Navigation Drawer"
        aria-hidden={!mobileDrawerOpen}
      >
        <div className="mobile-drawer-header">
          <Link
            to="/"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="FESTIQ Home"
          >
            <FestiqLogo variant="full" size="sm" showTagline={true} tagline="Campus Events" />
          </Link>
          <button
            type="button"
            className="mobile-drawer-close"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close navigation drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card inside Mobile Drawer */}
        {isAuthenticated && user && (
          <div className="mobile-user-card">
            <div className="mobile-user-avatar">{getInitials(user.fullName)}</div>
            <div className="mobile-user-info">
              <span className="mobile-user-name">{user.fullName}</span>
              <span className="mobile-user-email">{user.email}</span>
            </div>
          </div>
        )}

        {/* Navigation Links inside Drawer */}
        <nav className="mobile-drawer-nav">
          <ul className="mobile-nav-list">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.path} className="mobile-nav-item">
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `mobile-nav-link ${isActive ? 'active' : ''} ${item.isRole ? 'role-link' : ''}`
                    }
                    onClick={() => setMobileDrawerOpen(false)}
                  >
                    <IconComponent size={18} className="mobile-nav-icon" />
                    <span className="mobile-nav-text">{item.label}</span>
                    {item.isRole && <span className="nav-role-badge">Staff</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Drawer Actions */}
        <div className="mobile-drawer-footer">
          <button
            type="button"
            className="mobile-theme-toggle"
            onClick={onToggleTheme}
          >
            <span className="mobile-theme-icon">
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </span>
            <span>Theme: {isLight ? 'Academic Blue' : 'Midnight Forest'}</span>
          </button>

          {!isAuthenticated ? (
            <Button
              variant="primary"
              size="md"
              icon={<UserCheck size={16} />}
              onClick={() => {
                setMobileDrawerOpen(false);
                onOpenAuthModal();
              }}
              className="mobile-auth-btn"
            >
              Login / Sign Up
            </Button>
          ) : (
            <button
              type="button"
              className="mobile-logout-btn"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          )}

          <div className="mobile-drawer-badge">
            <span className="badge-pulse-dot" />
            <span>KIIT University Events Portal</span>
          </div>
        </div>
      </aside>
    </>
  );
}
