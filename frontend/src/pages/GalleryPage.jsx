import React, { useState, useEffect, useMemo } from 'react';
import { Image as ImageIcon, Calendar, Layers, Sparkles, AlertCircle, Eye } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import GalleryLightboxModal from '../components/gallery/GalleryLightboxModal';
import { fetchGallery } from '../services/api';
import './GalleryPage.css';

const CATEGORIES = [
  'All',
  'Technical',
  'Cultural',
  'Gaming',
  'Workshops',
  'Management',
  'Sports'
];

export default function GalleryPage() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Lightbox modal state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      const res = await fetchGallery();
      if (isMounted) {
        if (res.success) {
          setAlbums(res.data);
        } else {
          setError(res.error || 'Failed to load campus gallery');
        }
        setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const filteredAlbums = useMemo(() => {
    if (selectedCategory === 'All') return albums;
    return albums.filter(
      (a) => (a.category || '').toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [albums, selectedCategory]);

  const handleOpenLightbox = (album, index = 0) => {
    setActiveAlbum(album);
    setActivePhotoIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="gallery-page">
      <div className="container">
        {/* Header */}
        <header className="gallery-header">
          <div className="gallery-tag">
            <ImageIcon size={14} className="tag-icon" />
            <span>Campus Visual Archive</span>
          </div>

          <h1 className="gallery-title">
            Campus Event <span className="text-gradient">Gallery</span>
          </h1>

          <p className="gallery-subtitle">
            Relive memorable moments from previously conducted college fests, 36-hour hackathons, amphitheatre musical galas, and championship leagues.
          </p>

          <div className="demo-disclaimer-banner">
            <Sparkles size={14} className="disclaimer-sparkle" />
            <span>Demonstration Gallery Records — Archived media showcasing previous campus celebrations. Genuine university photography will be archived here as events conclude.</span>
          </div>
        </header>

        {/* Filter Pills */}
        <div className="gallery-filters-row">
          <div className="gallery-pills" role="tablist" aria-label="Filter gallery by category">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat}
                className={`gallery-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="gallery-count-badge">
            Showing <strong>{filteredAlbums.length}</strong> {filteredAlbums.length === 1 ? 'Album' : 'Albums'}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="gallery-loading-state">
            <div className="gallery-spinner" />
            <p>Loading campus photo archive...</p>
          </div>
        ) : error ? (
          <div className="gallery-error-state">
            <AlertCircle size={32} />
            <p>{error}</p>
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="gallery-empty-state">
            <ImageIcon size={48} className="empty-icon" />
            <h3>No Albums Found</h3>
            <p>There are no archived albums under the "{selectedCategory}" category yet.</p>
            <Button variant="secondary" size="sm" onClick={() => setSelectedCategory('All')}>
              View All Categories
            </Button>
          </div>
        ) : (
          <div className="gallery-grid">
            {filteredAlbums.map((album) => {
              const photoCount = album.photos ? album.photos.length : 1;
              return (
                <article
                  key={album.id}
                  className="gallery-card"
                  onClick={() => handleOpenLightbox(album, 0)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenLightbox(album, 0);
                    }
                  }}
                  aria-label={`View ${album.eventName} album (${photoCount} photos)`}
                >
                  {/* Cover Media */}
                  <div className="gallery-card-media">
                    <img
                      src={album.coverImage}
                      alt={album.eventName}
                      className="gallery-card-img"
                      loading="lazy"
                    />
                    <div className="gallery-card-overlay">
                      <span className="gallery-view-hint">
                        <Eye size={18} /> View Album
                      </span>
                    </div>

                    <div className="gallery-card-badges">
                      <Badge variant={album.category} size="sm">
                        {album.category}
                      </Badge>
                      <span className="gallery-photo-count">
                        <ImageIcon size={12} /> {photoCount} Photos
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="gallery-card-body">
                    <div className="gallery-card-date">
                      <Calendar size={13} className="meta-icon" />
                      <span>{album.date}</span>
                    </div>

                    <h3 className="gallery-card-title">{album.eventName}</h3>
                    <p className="gallery-card-desc">{album.description}</p>

                    <div className="gallery-card-footer">
                      <span className="gallery-card-link">
                        Explore Photos ({photoCount})
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <GalleryLightboxModal
        isOpen={lightboxOpen}
        album={activeAlbum}
        initialPhotoIndex={activePhotoIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}

