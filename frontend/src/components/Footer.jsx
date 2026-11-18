import React from 'react';
import { Link } from 'react-router-dom';
import FestiqLogo from './common/FestiqLogo';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-wrapper">
      <div className="container footer-container">
        {/* Top Grid Section */}
        <div className="footer-top">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <Link to="/" className="footer-brand" aria-label="FESTIQ Home">
              <FestiqLogo variant="full" size="md" />
            </Link>
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
              <span className="tech-badge">React Router</span>
              <span className="tech-badge">Express</span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Quick Navigation</h4>
            <ul className="footer-list">
              <li><Link to="/">Home Overview</Link></li>
              <li><Link to="/events">Explore Events</Link></li>
              <li><Link to="/host-event">Host an Event</Link></li>
              <li><Link to="/gallery">Campus Gallery</Link></li>
              <li><Link to="/about">About Platform</Link></li>
            </ul>
          </div>

          {/* Categories Column */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Event Domains</h4>
            <ul className="footer-list">
              <li><Link to="/events?category=Technical">Technical & Hackathons</Link></li>
              <li><Link to="/events?category=Cultural">Cultural & Arts</Link></li>
              <li><Link to="/events?category=Gaming">E-Sports & Gaming</Link></li>
              <li><Link to="/events?category=Workshops">Hands-on Workshops</Link></li>
              <li><Link to="/events?category=Management">Business & Startups</Link></li>
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
            <span>Built with Semantic HTML5, Custom CSS3, React Router & Node.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
