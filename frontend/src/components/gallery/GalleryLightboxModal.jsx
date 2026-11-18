import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Tag, Image as ImageIcon } from 'lucide-react';
import Badge from '../ui/Badge';
import { useScrollLock } from '../../hooks/useScrollLock';
import './GalleryLightboxModal.css';

export default function GalleryLightboxModal({
  isOpen,
  album,
  initialPhotoIndex = 0,
  onClose
}) {
  useScrollLock(isOpen);
  const [currentIndex, setCurrentIndex] = React.useState(initialPhotoIndex);

  useEffect(() => {
    setCurrentIndex(initialPhotoIndex);
  }, [initialPhotoIndex, album]);

  const photos = album?.photos || [];
  const currentPhoto = photos[currentIndex] || null;

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !album || !currentPhoto) return null;

  return (
    <div className="lightbox-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo Lightbox">
      <div className="lightbox-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Top Bar */}
        <div className="lightbox-header">
          <div className="lightbox-meta">
            <span className="lightbox-album-title">{album.eventName}</span>
            <div className="lightbox-tags">
              <Badge variant={album.category} size="sm">
                {album.category}
              </Badge>
              <span className="lightbox-date">
                <Calendar size={13} /> {album.date}
              </span>
            </div>
          </div>

          <div className="lightbox-actions">
            <span className="lightbox-counter">
              {currentIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={onClose}
              aria-label="Close photo lightbox"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stage */}
        <div className="lightbox-stage">
          {photos.length > 1 && (
            <button
              type="button"
              className="lightbox-nav-btn prev"
              onClick={handlePrev}
              aria-label="Previous photo"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          <div className="lightbox-image-container">
            <img
              src={currentPhoto.url}
              alt={currentPhoto.caption || album.eventName}
              className="lightbox-main-image"
            />
          </div>

          {photos.length > 1 && (
            <button
              type="button"
              className="lightbox-nav-btn next"
              onClick={handleNext}
              aria-label="Next photo"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>

        {/* Caption & Thumbnail Strip */}
        <div className="lightbox-footer">
          <p className="lightbox-caption">
            {currentPhoto.caption || album.description}
          </p>

          {photos.length > 1 && (
            <div className="lightbox-thumbs">
              {photos.map((p, idx) => (
                <button
                  key={p.id || idx}
                  type="button"
                  className={`lightbox-thumb-btn ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`View photo ${idx + 1}`}
                >
                  <img src={p.url} alt="" className="lightbox-thumb-img" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

