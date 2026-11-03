import React from 'react';
import { Sparkles, Globe, Code2 } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer id="about" className="footer-wrapper">
      <div className="container footer-container">
        {/* Top Grid Section */}
        <div className="footer-top">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <div className="footer-brand">
              <div className="brand-icon-box">
                <Sparkles size={16} className="brand-sparkle" />
              </div>
              <span className="brand-title">FESTIQ</span>
            </div>
            <p className="footer-tagline">Discover. Attend. Experience.</p>
            <p className="footer-description">
              A unified campus event discovery and registration platform engineered 
              for seamless student engagement, cultural showcases, and technical symposia.
            </p>
            <div className="footer-tech-stack" aria-label="Technology Stack">
              <span className="tech-badge">HTML5</span>
              <span className="tech-badge">CSS3</span>
              <span className="tech-badge">ES6+ JS</span>
              <span className="tech-badge">React</span>
              <span className="tech-badge">Express</span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Quick Navigation</h4>
            <ul className="footer-list">
              <li><a href="#home" onClick={(e) => handleNavClick(e, 'home')}>Home Overview</a></li>
              <li><a href="#featured" onClick={(e) => handleNavClick(e, 'featured')}>Featured Highlights</a></li>
              <li><a href="#categories" onClick={(e) => handleNavClick(e, 'categories')}>Event Categories</a></li>
              <li><a href="#about" onClick={(e) => handleNavClick(e, 'about')}>About Platform</a></li>
            </ul>
          </div>

          {/* Categories Column */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Event Domains</h4>
            <ul className="footer-list">
              <li><a href="#categories" onClick={(e) => handleNavClick(e, 'categories')}>Technical & Hackathons</a></li>
              <li><a href="#categories" onClick={(e) => handleNavClick(e, 'categories')}>Cultural & Arts</a></li>
              <li><a href="#categories" onClick={(e) => handleNavClick(e, 'categories')}>E-Sports & Gaming</a></li>
              <li><a href="#categories" onClick={(e) => handleNavClick(e, 'categories')}>Hands-on Workshops</a></li>
              <li><a href="#categories" onClick={(e) => handleNavClick(e, 'categories')}>Business & Startups</a></li>
            </ul>
          </div>

          {/* Academic Context Column */}
          <div className="footer-academic-col">
            <h4 className="footer-heading">Academic Project</h4>
            <p className="academic-meta">
              Submitted for <strong>University Semester-End Web Designing Evaluation</strong>.
            </p>
            <div className="system-status-indicator" role="status">
              <span className="status-dot" aria-hidden="true"></span>
              <span className="status-text">Backend REST API Active</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p className="copyright-text">
            &copy; {currentYear} FESTIQ Platform. Designed & Developed for Web Designing Coursework.
          </p>
          <div className="footer-credits">
            <span>Built with Semantic HTML5, Custom CSS3 & Node.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
