import React from 'react';
import { Sparkles, Compass, Flame, Users, Trophy } from 'lucide-react';
import './Hero.css';

export default function Hero({ onExploreClick }) {
  return (
    <section id="home" className="hero-section">
      {/* Background Ambient Glows */}
      <div className="hero-glow hero-glow-purple"></div>
      <div className="hero-glow hero-glow-cyan"></div>

      <div className="container hero-container">
        {/* Category Pill Tag */}
        <div className="hero-badge">
          <Sparkles size={15} className="hero-badge-icon" />
          <span>University Campus Event Platform</span>
        </div>

        {/* Main Headline */}
        <h1 className="hero-title">
          Where Campus Culture Meets <span className="text-gradient">Tomorrow</span>.
        </h1>

        {/* Tagline & Description */}
        <p className="hero-tagline">
          Discover. Attend. Experience.
        </p>
        <p className="hero-description">
          The premier platform to explore hackathons, cultural galas, esports tournaments, 
          and creative workshops. Stay connected with everything happening across campus.
        </p>

        {/* CTA Actions */}
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={onExploreClick}>
            <Compass size={18} />
            <span>Explore Events</span>
          </button>
          <a href="#featured" className="btn btn-secondary">
            <Flame size={18} />
            <span>View Featured</span>
          </a>
        </div>

        {/* Platform Stat Strip */}
        <div className="hero-stats">
          <div className="stat-card">
            <div className="stat-number text-gradient">6+</div>
            <div className="stat-label">Active Categories</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-cyan-gradient">2,500+</div>
            <div className="stat-label">Expected Attendees</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-gradient">₹2,40,000+</div>
            <div className="stat-label">Total Prize Pool</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-cyan-gradient">100%</div>
            <div className="stat-label">Verified Campus Fests</div>
          </div>
        </div>
      </div>
    </section>
  );
}
