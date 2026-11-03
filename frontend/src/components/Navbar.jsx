import React, { useState } from 'react';
import { Calendar, Menu, X, Sparkles, ArrowRight } from 'lucide-react';
import './Navbar.css';

export default function Navbar({ onExploreClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar-wrapper">
      <div className="container navbar-container">
        {/* Brand Logo */}
        <a href="#" className="navbar-brand">
          <div className="brand-icon-box">
            <Sparkles size={20} className="brand-sparkle" />
          </div>
          <div className="brand-text-block">
            <span className="brand-title">FESTIQ</span>
            <span className="brand-tagline">Campus Events</span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="navbar-links">
          <a href="#home" className="nav-link active">Home</a>
          <a href="#featured" className="nav-link">Featured</a>
          <a href="#categories" className="nav-link">Categories</a>
          <a href="#about" className="nav-link">About</a>
        </nav>

        {/* Desktop Action */}
        <div className="navbar-action">
          <button 
            className="btn btn-primary btn-sm"
            onClick={onExploreClick}
          >
            <span>Explore Events</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          className="mobile-toggle"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-links">
          <a href="#home" className="mobile-nav-link" onClick={closeMenu}>Home</a>
          <a href="#featured" className="mobile-nav-link" onClick={closeMenu}>Featured Events</a>
          <a href="#categories" className="mobile-nav-link" onClick={closeMenu}>Categories</a>
          <a href="#about" className="mobile-nav-link" onClick={closeMenu}>About FESTIQ</a>
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '12px' }}
            onClick={() => {
              closeMenu();
              if (onExploreClick) onExploreClick();
            }}
          >
            <span>Explore Events</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
