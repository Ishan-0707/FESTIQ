import React from 'react';
import { Sparkles, Compass, Flame } from 'lucide-react';
import Button from './ui/Button';
import './Hero.css';

export default function Hero({ onExploreClick }) {
  const handleScrollToFeatured = (e) => {
    e.preventDefault();
    const el = document.getElementById('featured');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="hero-section">
      {/* Background Ambient Glows */}
      <div className="hero-glow hero-glow-purple" aria-hidden="true"></div>
      <div className="hero-glow hero-glow-cyan" aria-hidden="true"></div>

      <div className="container hero-container">
        {/* Category Pill Tag */}
        <div className="hero-badge">
          <Sparkles size={14} className="hero-badge-icon" />
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

        {/* CTA Actions using Button System */}
        <div className="hero-actions">
          <Button
            variant="primary"
            size="lg"
            icon={<Compass size={18} />}
            iconPosition="left"
            onClick={onExploreClick}
          >
            Explore Events
          </Button>

          <Button
            variant="secondary"
            size="lg"
            icon={<Flame size={18} />}
            iconPosition="left"
            onClick={handleScrollToFeatured}
          >
            View Featured
          </Button>
        </div>

        {/* Platform Metrics Bar */}
        <div className="hero-stats" role="region" aria-label="Platform Statistics">
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
