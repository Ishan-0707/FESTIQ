import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import './HostEventCTA.css';

export default function HostEventCTA() {
  return (
    <section className="host-event-cta-section">
      <div className="host-event-cta-container">
        <div className="host-event-cta-card">
          <div className="cta-left-content">
            <div className="cta-badge">
              <Sparkles size={15} />
              <span>For Student Clubs & Organizers</span>
            </div>
            <h2 className="cta-title">Planning a Campus Event or Hackathon?</h2>
            <p className="cta-description">
              Submit your event proposal through the FESTIQ institutional desk. Our team coordinates college department verification, venue feasibility, and official catalogue scheduling.
            </p>
            <div className="cta-perks">
              <div className="perk-item">
                <ShieldCheck size={16} className="perk-icon" />
                <span>Verified College Sanctioning</span>
              </div>
              <div className="perk-item">
                <CalendarPlus size={16} className="perk-icon" />
                <span>Campus-Wide Student Reach</span>
              </div>
            </div>
            <div className="cta-actions">
              <Link to="/host-event">
                <Button variant="primary" size="lg" icon={<ArrowRight size={18} />}>
                  Host an Event at FESTIQ
                </Button>
              </Link>
              <Link to="/host-event#track" className="cta-secondary-link">
                Track Existing Proposal &rarr;
              </Link>
            </div>
          </div>
          <div className="cta-graphic-side">
            <div className="graphic-backdrop" />
            <div className="graphic-floating-card top-card">
              <div className="gf-tag">Institutional Desk</div>
              <div className="gf-title">Robowars KIIT 2026</div>
              <div className="gf-status verified">✓ College Verified</div>
            </div>
            <div className="graphic-floating-card bottom-card">
              <div className="gf-tag">Audit Feasibility</div>
              <div className="gf-title">Campus 6 Auditorium</div>
              <div className="gf-status pass">✓ Feasibility Pass</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

