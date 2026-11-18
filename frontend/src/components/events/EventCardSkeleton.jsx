import React from 'react';
import './EventCardSkeleton.css';

export default function EventCardSkeleton({ count = 1 }) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div key={i} className="festiq-card-skeleton" aria-hidden="true">
          <div className="skeleton-media skeleton" />
          <div className="skeleton-body">
            <div className="skeleton-meta-row">
              <div className="skeleton-pill skeleton" />
              <div className="skeleton-pill skeleton" />
            </div>
            <div className="skeleton-line title-line skeleton" />
            <div className="skeleton-line text-line skeleton" />
            <div className="skeleton-line text-line-short skeleton" />
            <div className="skeleton-footer">
              <div className="skeleton-pricing skeleton" />
              <div className="skeleton-actions-row">
                <div className="skeleton-btn skeleton" />
                <div className="skeleton-btn skeleton" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

