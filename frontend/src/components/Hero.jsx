import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Ticket } from 'lucide-react';
import Button from './ui/Button';
import FestiqLogo from './common/FestiqLogo';
import './Hero.css';

export default function Hero({ events = [], onOpenRegister }) {
  const navigate = useNavigate();

  // Dynamically calculate platform metrics from verified event dataset
  const stats = React.useMemo(() => {
    if (!events || events.length === 0) {
      return {
        totalEvents: 25,
        individualCapacity: '5,023',
        teamCapacity: '296',
        prizePool: '₹3,56,100'
      };
    }

    const totalEvents = events.length;
    const individualEvents = events.filter((e) => e.feeType !== 'per_team');
    const teamEvents = events.filter((e) => e.feeType === 'per_team');

    const indCap = individualEvents.reduce((sum, e) => sum + (Number(e.capacity) || 0), 0);
    const teamCap = teamEvents.reduce((sum, e) => sum + (Number(e.capacity) || 0), 0);
    const totalPrize = events.reduce((sum, e) => sum + (Number(e.prizeAmount) || 0), 0);

    return {
      totalEvents: totalEvents.toLocaleString('en-IN'),
      individualCapacity: indCap.toLocaleString('en-IN'),
      teamCapacity: teamCap.toLocaleString('en-IN'),
      prizePool: `₹${totalPrize.toLocaleString('en-IN')}`
    };
  }, [events]);

  return (
    <section className="hero-section">
      {/* Background Ambient Glows */}
      <div className="hero-glow hero-glow-primary" aria-hidden="true"></div>
      <div className="hero-glow hero-glow-accent" aria-hidden="true"></div>

      <div className="container hero-container">
        {/* Category Pill Tag */}
        <div className="hero-badge">
          <FestiqLogo variant="symbol" size={18} />
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

        {/* CTA Actions: Explore Events & Register Now */}
        <div className="hero-actions">
          <Button
            variant="primary"
            size="lg"
            icon={<Compass size={18} />}
            iconPosition="left"
            onClick={() => navigate('/events')}
          >
            Explore Events
          </Button>

          <Button
            variant="secondary"
            size="lg"
            icon={<Ticket size={18} />}
            iconPosition="left"
            onClick={onOpenRegister}
          >
            Register Now
          </Button>
        </div>

        {/* Platform Metrics Bar (Dynamically calculated from verified event dataset) */}
        <div className="hero-stats" role="region" aria-label="Platform Statistics">
          <div className="stat-card">
            <div className="stat-number text-gradient">{stats.totalEvents}</div>
            <div className="stat-label">Campus Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-cyan-gradient">{stats.individualCapacity}</div>
            <div className="stat-label">Individual Seats</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-cyan-gradient">{stats.teamCapacity}</div>
            <div className="stat-label">Team Slots</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-gradient">{stats.prizePool}</div>
            <div className="stat-label">Total Prize Pool</div>
          </div>
        </div>
      </div>
    </section>
  );
}
