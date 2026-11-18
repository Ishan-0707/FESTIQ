import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Music, Gamepad2, Wrench, Briefcase, Trophy, ChevronRight } from 'lucide-react';
import './CategoryPreview.css';

const CATEGORIES = [
  {
    id: 'Technical',
    title: 'Technical & Coding',
    desc: 'Hackathons, Web3, AI dev challenges',
    icon: Cpu,
    colorClass: 'cat-tech',
    count: '4 Events'
  },
  {
    id: 'Cultural',
    title: 'Cultural & Arts',
    desc: 'Battle of bands, fusion dance, theater',
    icon: Music,
    colorClass: 'cat-cultural',
    count: '4 Events'
  },
  {
    id: 'Gaming',
    title: 'E-Sports & Gaming',
    desc: 'LAN tournaments, tactical FPS, battle royale',
    icon: Gamepad2,
    colorClass: 'cat-gaming',
    count: '4 Events'
  },
  {
    id: 'Workshops',
    title: 'Hands-on Workshops',
    desc: 'Drone assembly, robotics, design systems',
    icon: Wrench,
    colorClass: 'cat-workshops',
    count: '4 Events'
  },
  {
    id: 'Management',
    title: 'Business & Startups',
    desc: 'Pitch competitions, case studies, VC summits',
    icon: Briefcase,
    colorClass: 'cat-management',
    count: '4 Events'
  },
  {
    id: 'Sports',
    title: 'Campus Athletics',
    desc: 'Futsal derby, basketball knockout',
    icon: Trophy,
    colorClass: 'cat-sports',
    count: '4 Events'
  }
];

export default function CategoryPreview({ events = [], onSelectCategory }) {
  const navigate = useNavigate();

  // Dynamic event counts calculated from actual event API dataset
  const categoryCounts = React.useMemo(() => {
    const counts = {};
    for (const ev of events) {
      if (ev.category) {
        counts[ev.category] = (counts[ev.category] || 0) + 1;
      }
    }
    return counts;
  }, [events]);

  const handleCardClick = (catId) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    } else {
      navigate(`/events?category=${catId}`);
    }
  };

  return (
    <section className="categories-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Explore By Discipline</span>
          <h2 className="section-title">
            Browse By <span className="text-gradient">Category</span>
          </h2>
          <p className="section-subtitle">
            Find the perfect competition, symposium, or celebration matched to your passions.
          </p>
        </div>

        <div className="categories-grid">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = categoryCounts[cat.id] !== undefined 
              ? `${categoryCounts[cat.id]} ${categoryCounts[cat.id] === 1 ? 'Event' : 'Events'}`
              : (events.length > 0 ? '0 Events' : cat.count);

            return (
              <div
                key={cat.id}
                className={`category-card ${cat.colorClass}`}
                onClick={() => handleCardClick(cat.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(cat.id);
                  }
                }}
                aria-label={`Explore ${cat.title} events`}
              >
                <div className="cat-icon-wrapper" aria-hidden="true">
                  <Icon size={22} />
                </div>

                <div className="cat-content">
                  <div className="cat-header-row">
                    <h3 className="cat-title">{cat.title}</h3>
                    <span className="cat-count">{count}</span>
                  </div>
                  <p className="cat-desc">{cat.desc}</p>
                </div>

                <ChevronRight size={18} className="cat-arrow" aria-hidden="true" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
