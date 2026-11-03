import React from 'react';
import { Sparkles, Heart, Code2, Globe, Github } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="about" className="footer-wrapper">
      <div className="container footer-container">
        {/* Top Section */}
        <div className="footer-top">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <div className="footer-brand">
              <div className="brand-icon-box">
                <Sparkles size={18} className="brand-sparkle" />
              </div>
              <span className="brand-title">FESTIQ</span>
            </div>
            <p className="footer-tagline">Discover. Attend. Experience.</p>
            <p className="footer-description">
              A unified campus event discovery and registration platform engineered 
              for seamless student engagement, cultural showcases, and technical symposia.
            </p>
            <div className="footer-tech-stack">
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
              <li><a href="#home">Home</a></li>
              <li><a href="#featured">Featured Highlights</a></li>
              <li><a href="#categories">Event Categories</a></li>
              <li><a href="#about">Project Overview</a></li>
            </ul>
          </div>

          {/* Categories Column */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Event Domains</h4>
            <ul className="footer-list">
              <li><a href="#categories">Technical & Hackathons</a></li>
              <li><a href="#categories">Cultural & Performing Arts</a></li>
              <li><a href="#categories">E-Sports & Gaming</a></li>
              <li><a href="#categories">Hands-on Workshops</a></li>
              <li><a href="#categories">Management & Pitching</a></li>
            </ul>
          </div>

          {/* Academic Context Column */}
          <div className="footer-academic-col">
            <h4 className="footer-heading">Academic Project</h4>
            <p className="academic-meta">
              Submitted for <strong>University Semester-End Web Designing Evaluation</strong>.
            </p>
            <div className="system-status-indicator">
              <span className="status-dot"></span>
              <span className="status-text">Backend API Connected</span>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="footer-bottom">
          <p className="copyright-text">
            &copy; {currentYear} FESTIQ Platform. Designed & Developed for Web Designing Coursework.
          </p>
          <div className="footer-credits">
            <span>Built with semantic HTML5, custom CSS3 & Node.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
