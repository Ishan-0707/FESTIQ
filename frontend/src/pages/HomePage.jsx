import React from 'react';
import Hero from '../components/Hero';
import FeaturedEvents from '../components/FeaturedEvents';
import CategoryPreview from '../components/CategoryPreview';
import HostEventCTA from '../components/home/HostEventCTA';

export default function HomePage({
  events = [],
  loading = false,
  error = null,
  onRetry,
  onEventSelect,
  onOpenRegister,
  onRegisterEvent
}) {
  return (
    <div className="festiq-home-page page-entrance">
      {/* 1. Hero Section */}
      <Hero events={events} onOpenRegister={() => onOpenRegister(null)} />

      {/* 2. Featured Events Section */}
      <FeaturedEvents
        events={events}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onEventSelect={onEventSelect}
        onRegisterEvent={onRegisterEvent}
      />

      {/* 3. Browse By Category Preview */}
      <CategoryPreview events={events} />

      {/* 4. Host an Event Public Call-to-Action */}
      <HostEventCTA />
    </div>
  );
}

