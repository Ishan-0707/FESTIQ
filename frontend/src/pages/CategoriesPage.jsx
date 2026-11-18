import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Music, Gamepad2, Wrench, Briefcase, Trophy, ChevronRight, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import './CategoriesPage.css';

const CATEGORIES = [
  {
    id: 'Technical',
    title: 'Technical & Coding',
    desc: 'Hackathons, Web3, autonomous AI, robotics, and cloud developer challenges.',
    icon: Cpu,
    colorClass: 'cat-tech',
    count: '4 Events',
    leadFest: 'HackNova 2026'
  },
  {
    id: 'Cultural',
    title: 'Cultural & Arts',
    desc: 'Inter-college battle of the bands, classical fusion dance, and starry amphitheatre concerts.',
    icon: Music,
    colorClass: 'cat-cultural',
    count: '4 Events',
    leadFest: 'Rhythm & Echoes Gala'
  },
  {
    id: 'Gaming',
    title: 'E-Sports & Gaming',
    desc: 'Gigabit LAN tactical FPS tournaments, mobile battle royale, and live-streamed finals.',
    icon: Gamepad2,
    colorClass: 'cat-gaming',
    count: '4 Events',
    leadFest: 'Valorant & BGMI Showdown'
  },
  {
    id: 'Workshops',
    title: 'Hands-on Workshops',
    desc: 'Drone assembly, sensor calibration, optical flow flight, and ROS2 computer vision.',
    icon: Wrench,
    colorClass: 'cat-workshops',
    count: '4 Events',
    leadFest: 'Robotics Drone Bootcamp'
  },
  {
    id: 'Management',
    title: 'Business & Startups',
    desc: 'Pitch competitions, investor jury evaluations, venture grants, and alumni mentorship.',
    icon: Briefcase,
    colorClass: 'cat-management',
    count: '4 Events',
    leadFest: 'Apex Venture Fest'
  },
  {
    id: 'Sports',
    title: 'Campus Athletics',
    desc: 'Inter-collegiate floodlit futsal derby, knockout brackets, and intense athletic spirit.',
    icon: Trophy,
    colorClass: 'cat-sports',
    count: '4 Events',
    leadFest: 'Futsal Derby Derby'
  }
];

export default function CategoriesPage({ events = [] }) {
  const navigate = useNavigate();

  // Dynamically calculate category counts from actual event dataset
  const categoryCounts = React.useMemo(() => {
    const counts = {};
    for (const ev of events) {
      if (ev.category) {
        counts[ev.category] = (counts[ev.category] || 0) + 1;
      }
    }
    return counts;
  }, [events]);

  const handleSelectCategory = (categoryId) => {
    navigate(`/events?category=${categoryId}`);
  };

  return (
    <div className="categories-page-wrapper page-entrance">
      <div className="container">
        {/* Header */}
        <div className="categories-page-header">
          <span className="section-tag">Academic Disciplines</span>
          <h1 className="categories-page-title">
            Browse By <span className="text-gradient">Category</span>
          </h1>
          <p className="categories-page-subtitle">
            Explore college fests grouped by discipline. Select any domain below to view all corresponding campus competitions and workshops.
          </p>
        </div>

        {/* Responsive Grid with Overflow Protection */}
        <div className="categories-page-grid">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const eventCount = categoryCounts[cat.id] !== undefined
              ? `${categoryCounts[cat.id]} ${categoryCounts[cat.id] === 1 ? 'Event' : 'Events'}`
              : (events.length > 0 ? '0 Events' : cat.count);

            return (
              <div
                key={cat.id}
                className={`category-feature-card ${cat.colorClass}`}
                onClick={() => handleSelectCategory(cat.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectCategory(cat.id);
                  }
                }}
                aria-label={`View ${cat.title} events`}
              >
                <div className="card-top-row">
                  <div className="cat-icon-wrapper" aria-hidden="true">
                    <Icon size={24} />
                  </div>
                  <span className="cat-count-badge">{eventCount}</span>
                </div>

                <div className="card-main-content">
                  <h3 className="cat-card-title">{cat.title}</h3>
                  <p className="cat-card-desc">{cat.desc}</p>
                </div>

                <div className="card-action-bar">
                  <span className="cat-lead-label">Lead: {cat.leadFest}</span>
                  <span className="cat-explore-link">
                    Explore <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global CTA Box */}
        <div className="categories-cta-strip">
          <div className="cta-strip-text">
            <h4>Looking for all competitions across every domain?</h4>
            <p>Access the full catalogue with instant search and live filters.</p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<ArrowRight size={16} />}
            iconPosition="right"
            onClick={() => navigate('/events')}
          >
            Explore Complete Catalogue
          </Button>
        </div>
      </div>
    </div>
  );
}

