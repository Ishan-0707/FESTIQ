import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Menu, X } from 'lucide-react';
import Button from './ui/Button';
import './Navbar.css';

export default function Navbar({ onExploreClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll position for dynamic shadow/blur
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard accessibility: close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (targetId === 'explore') {
      if (onExploreClick) onExploreClick();
      return;
    }
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`navbar-wrapper ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        {/* Brand Logo */}
        <a href="#home" className="navbar-brand" onClick={(e) => handleNavClick(e, 'home')}>
          <div className="brand-icon-box">
            <Sparkles size={18} className="brand-sparkle" />
          </div>
          <div className="brand-text-block">
            <span className="brand-title">FESTIQ</span>
            <span className="brand-tagline">Campus Events</span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="navbar-links" aria-label="Main Navigation">
          <a href="#home" className="nav-link active" onClick={(e) => handleNavClick(e, 'home')}>Home</a>
          <a href="#featured" className="nav-link" onClick={(e) => handleNavClick(e, 'featured')}>Featured</a>
          <a href="#categories" className="nav-link" onClick={(e) => handleNavClick(e, 'categories')}>Categories</a>
          <a href="#about" className="nav-link" onClick={(e) => handleNavClick(e, 'about')}>About</a>
        </nav>

        {/* Desktop Action Button */}
        <div className="navbar-action">
          <Button
            variant="primary"
            size="sm"
            icon={<ArrowRight size={15} />}
            iconPosition="right"
            onClick={onExploreClick}
          >
            Explore Events
          </Button>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          className="mobile-toggle"
          onClick={toggleMobileMenu}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      <div
        className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="container mobile-drawer-inner">
          <nav className="mobile-drawer-links">
            <a href="#home" className="mobile-nav-link" onClick={(e) => handleNavClick(e, 'home')}>Home</a>
            <a href="#featured" className="mobile-nav-link" onClick={(e) => handleNavClick(e, 'featured')}>Featured Highlights</a>
            <a href="#categories" className="mobile-nav-link" onClick={(e) => handleNavClick(e, 'categories')}>Event Categories</a>
            <a href="#about" className="mobile-nav-link" onClick={(e) => handleNavClick(e, 'about')}>About Platform</a>
          </nav>
          <div className="mobile-drawer-action">
            <Button
              variant="primary"
              size="md"
              icon={<ArrowRight size={16} />}
              iconPosition="right"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onExploreClick) onExploreClick();
              }}
              style={{ width: '100%' }}
            >
              Explore All Events
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
