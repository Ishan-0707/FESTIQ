import React, { useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Compass, 
  Calendar as CalendarIcon, 
  Image as GalleryIcon, 
  LayoutDashboard, 
  Info, 
  X 
} from 'lucide-react';
import FestiqLogo from '../common/FestiqLogo';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

export default function Sidebar({
  isOpen,
  onClose
}) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/events', label: 'Explore Events', icon: Compass },
    { path: '/calendar', label: 'Calendar', icon: CalendarIcon },
    { path: '/gallery', label: 'Gallery', icon: GalleryIcon },
    ...(isAuthenticated ? [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
    { path: '/about', label: 'About', icon: Info },
  ];

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close drawer on route change (for mobile)
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Main Sidebar Rail / Drawer */}
      <aside 
        className={`festiq-sidebar ${isOpen ? 'open' : ''}`}
        aria-label="Sidebar Navigation"
      >
        <div className="sidebar-inner">
          {/* Top Brand Header */}
          <div className="sidebar-header">
            <Link 
              to="/" 
              className="sidebar-brand"
              onClick={onClose}
              aria-label="FESTIQ Home"
            >
              <FestiqLogo 
                variant="full" 
                size="md" 
                showTagline={true} 
                tagline="Campus Events" 
              />
            </Link>

            {/* Mobile Close Button */}
            <button 
              type="button"
              className="sidebar-mobile-close"
              onClick={onClose}
              aria-label="Close Navigation Sidebar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav">
            <div className="nav-group-label">Navigation</div>
            <ul className="nav-list">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = item.path === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(item.path);

                return (
                  <li key={item.path} className="nav-item">
                    <NavLink
                      to={item.path}
                      className={({ isActive: navActive }) => 
                        `nav-link ${navActive || isActive ? 'active' : ''}`
                      }
                      onClick={onClose}
                    >
                      <IconComponent size={18} className="nav-icon" />
                      <span className="nav-text">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sidebar Footer Metadata */}
          <div className="sidebar-footer">
            <div className="sidebar-badge">
              <span className="badge-pulse-dot" />
              <span className="badge-text">KIIT University</span>
            </div>
            <p className="sidebar-caption">
              Discover. Attend. Experience.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
