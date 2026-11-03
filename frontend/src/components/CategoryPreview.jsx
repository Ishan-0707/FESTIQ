import React from 'react';
import { Cpu, Music, Gamepad2, Wrench, Briefcase, Trophy, ChevronRight } from 'lucide-react';
import './CategoryPreview.css';

const CATEGORIES = [
  {
    id: 'Technical',
    title: 'Technical & Coding',
    desc: 'Hackathons, Web3, AI dev challenges',
    icon: Cpu,
    colorClass: 'cat-tech',
    count: '3 Events'
  },
  {
    id: 'Cultural',
    title: 'Cultural & Arts',
    desc: 'Battle of bands, fusion dance, theater',
    icon: Music,
    colorClass: 'cat-cultural',
    count: '2 Events'
  },
  {
    id: 'Gaming',
    title: 'E-Sports & Gaming',
    desc: 'LAN tournaments, tactical FPS, battle royale',
    icon: Gamepad2,
    colorClass: 'cat-gaming',
    count: '2 Events'
  },
  {
    id: 'Workshops',
    title: 'Hands-on Workshops',
    desc: 'Drone assembly, robotics, design systems',
    icon: Wrench,
    colorClass: 'cat-workshops',
    count: '1 Event'
  },
  {
    id: 'Management',
    title: 'Business & Startups',
    desc: 'Pitch competitions, case studies, VC summits',
    icon: Briefcase,
    colorClass: 'cat-management',
    count: '1 Event'
  },
  {
    id: 'Sports',
    title: 'Campus Athletics',
    desc: 'Futsal derby, basketball knockout',
    icon: Trophy,
    colorClass: 'cat-sports',
    count: '1 Event'
  }
];

export default function CategoryPreview({ onSelectCategory }) {
  return (
    <section id="categories" className="categories-section">
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
            return (
              <div
                key={cat.id}
                className={`category-card ${cat.colorClass}`}
                onClick={() => onSelectCategory && onSelectCategory(cat.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onSelectCategory) onSelectCategory(cat.id);
                  }
                }}
                aria-label={`Filter events by ${cat.title}`}
              >
                <div className="cat-icon-wrapper">
                  <Icon size={22} />
                </div>
                <div className="cat-content">
                  <div className="cat-header-row">
                    <h3 className="cat-title">{cat.title}</h3>
                    <span className="cat-count">{cat.count}</span>
                  </div>
                  <p className="cat-desc">{cat.desc}</p>
                </div>
                <div className="cat-arrow" aria-hidden="true">
                  <ChevronRight size={18} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
