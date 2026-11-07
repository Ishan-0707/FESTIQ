import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Star,
  Upload,
  X,
  Calendar,
  Layers,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useToast } from '../../context/ToastContext';
import {
  fetchGallery,
  createGalleryAlbum,
  updateGalleryAlbum,
  deleteGalleryAlbum,
  uploadGalleryImage
} from '../../services/api';
import './GalleryManagementTab.css';

export default function GalleryManagementTab() {
  const toast = useToast();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    eventName: '',
    category: 'Cultural',
    date: '',
    description: '',
    coverImage: '',
    isFeatured: false,
    photos: []
  });

  // Photo adder temporary state
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchGallery();
      if (res.success) {
        setAlbums(res.data || []);
      } else {
        toast.error(res.error || 'Failed to load gallery albums');
      }
    } catch (err) {
      toast.error('Network error loading gallery albums');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  const handleOpenCreateModal = () => {
    setEditingAlbum(null);
    setFormData({
      eventName: '',
      category: 'Cultural',
      date: new Date().toISOString().split('T')[0],
      description: '',
      coverImage: '',
      isFeatured: false,
      photos: []
    });
    setNewPhotoUrl('');
    setNewPhotoCaption('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (album) => {
    setEditingAlbum(album);
    setFormData({
      eventName: album.eventName || '',
      category: album.category || 'Cultural',
      date: album.date || '',
      description: album.description || '',
      coverImage: album.coverImage || '',
      isFeatured: Boolean(album.isFeatured),
      photos: Array.isArray(album.photos) ? [...album.photos] : []
    });
    setNewPhotoUrl('');
    setNewPhotoCaption('');
    setModalOpen(true);
  };

  const handleFileUpload = (e, target) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      if (target === 'cover') {
        setUploadingCover(true);
      } else {
        setUploadingPhoto(true);
      }

      try {
        const res = await uploadGalleryImage(base64, file.name);
        if (res.success && res.data?.url) {
          toast.success('Image uploaded successfully');
          if (target === 'cover') {
            setFormData(prev => ({ ...prev, coverImage: res.data.url }));
          } else {
            setFormData(prev => ({
              ...prev,
              photos: [
                ...prev.photos,
                {
                  id: `img-${Date.now()}`,
                  url: res.data.url,
                  caption: newPhotoCaption || file.name.replace(/\.[^/.]+$/, '')
                }
              ]
            }));
            setNewPhotoCaption('');
          }
        } else {
          toast.error(res.error || res.message || 'Image upload failed');
        }
      } catch (err) {
        toast.error('Image upload failed: ' + err.message);
      } finally {
        if (target === 'cover') {
          setUploadingCover(false);
        } else {
          setUploadingPhoto(false);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddPhotoByUrl = () => {
    if (!newPhotoUrl.trim()) return;
    setFormData(prev => ({
      ...prev,
      photos: [
        ...prev.photos,
        {
          id: `img-${Date.now()}`,
          url: newPhotoUrl.trim(),
          caption: newPhotoCaption.trim() || 'Event Highlight'
        }
      ]
    }));
    setNewPhotoUrl('');
    setNewPhotoCaption('');
  };

  const handleRemovePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.eventName.trim()) {
      toast.error('Event title is required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingAlbum) {
        const res = await updateGalleryAlbum(editingAlbum.id, formData);
        if (res.success) {
          toast.success(`Album "${formData.eventName}" updated successfully`);
          setModalOpen(false);
          await loadAlbums();
        } else {
          toast.error(res.error || 'Failed to update album');
        }
      } else {
        const res = await createGalleryAlbum(formData);
        if (res.success) {
          toast.success(`Album "${formData.eventName}" created successfully`);
          setModalOpen(false);
          await loadAlbums();
        } else {
          toast.error(res.error || 'Failed to create album');
        }
      }
    } catch (err) {
      toast.error('Error saving album: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!albumToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteGalleryAlbum(albumToDelete.id);
      if (res.success) {
        toast.success(`Album "${albumToDelete.eventName}" deleted successfully`);
        setDeleteModalOpen(false);
        setAlbumToDelete(null);
        await loadAlbums();
      } else {
        toast.error(res.error || 'Failed to delete album');
      }
    } catch (err) {
      toast.error('Error deleting album: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Filtered albums
  const filteredAlbums = albums.filter(album => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (album.eventName && album.eventName.toLowerCase().includes(q)) ||
      (album.description && album.description.toLowerCase().includes(q)) ||
      (album.category && album.category.toLowerCase().includes(q));

    const matchesCategory = categoryFilter === 'ALL' ||
      (album.category && album.category.toLowerCase() === categoryFilter.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="gallery-mgmt-container">
      {/* Header Actions */}
      <div className="gallery-mgmt-header">
        <div className="gallery-mgmt-header-left">
          <h2>Campus Event Gallery Management</h2>
          <p>Curate photo memories, highlight flagship festivals, and showcase campus spirit.</p>
        </div>

        <div className="gallery-mgmt-actions">
          <div className="gallery-search-box">
            <Search size={16} className="gallery-search-icon" />
            <input
              type="text"
              className="gallery-search-input"
              placeholder="Search albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem'
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="Technical">Technical</option>
            <option value="Cultural">Cultural</option>
            <option value="Sports">Sports</option>
            <option value="Management">Management</option>
            <option value="Gaming">Gaming</option>
            <option value="Flagship">Flagship</option>
          </select>

          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={handleOpenCreateModal}
          >
            Create Album
          </Button>
        </div>
      </div>

      {/* Grid of Albums */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <Loader2 size={32} className="spin-icon" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p>Loading photo albums...</p>
        </div>
      ) : filteredAlbums.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)'
        }}>
          <ImageIcon size={48} style={{ opacity: 0.4, margin: '0 auto 12px', color: 'var(--text-muted)' }} />
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 6px 0' }}>No Gallery Albums Found</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px 0', fontSize: '0.9rem' }}>
            {searchQuery || categoryFilter !== 'ALL'
              ? 'No albums match your active filters. Try resetting search criteria.'
              : 'Start by creating your first campus event album to showcase student activities.'}
          </p>
          <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenCreateModal}>
            Create New Album
          </Button>
        </div>
      ) : (
        <div className="gallery-mgmt-grid">
          {filteredAlbums.map(album => {
            const photoCount = Array.isArray(album.photos) ? album.photos.length : 0;
            return (
              <div key={album.id} className="gallery-mgmt-card">
                <div className="gallery-card-cover">
                  {album.coverImage ? (
                    <img src={album.coverImage} alt={album.eventName} />
                  ) : (
                    <div className="gallery-cover-placeholder">
                      <ImageIcon size={32} />
                      <span>No Cover Image</span>
                    </div>
                  )}
                  {album.isFeatured && (
                    <div className="gallery-featured-badge">
                      <Star size={12} fill="currentColor" /> Featured
                    </div>
                  )}
                  <div className="gallery-photo-count-badge">
                    <Layers size={12} /> {photoCount} Photos
                  </div>
                </div>

                <div className="gallery-card-body">
                  <div className="gallery-card-meta">
                    <Badge variant="primary">{album.category || 'Festival'}</Badge>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> {album.date || 'Recent'}
                    </span>
                  </div>

                  <h3 className="gallery-card-title">{album.eventName}</h3>
                  <p className="gallery-card-desc">
                    {album.description || 'Campus festival memories and highlight moments captured live.'}
                  </p>

                  <div className="gallery-card-footer">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Edit2 size={14} />}
                      onClick={() => handleOpenEditModal(album)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      onClick={() => {
                        setAlbumToDelete(album);
                        setDeleteModalOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Album Modal */}
      {modalOpen && (
        <div className="gallery-modal-overlay" onClick={() => !submitting && setModalOpen(false)}>
          <div className="gallery-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-modal-header">
              <h3>{editingAlbum ? `Edit Album: ${editingAlbum.eventName}` : 'Create New Gallery Album'}</h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="gallery-modal-body">
                <div className="form-group-gallery">
                  <label>Event Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HackNova 2026 Grand Finale"
                    value={formData.eventName}
                    onChange={(e) => setFormData(prev => ({ ...prev, eventName: e.target.value }))}
                  />
                </div>

                <div className="form-row-gallery">
                  <div className="form-group-gallery">
                    <label>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="Technical">Technical</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Sports">Sports</option>
                      <option value="Management">Management</option>
                      <option value="Gaming">Gaming</option>
                      <option value="Flagship">Flagship</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group-gallery">
                    <label>Event Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group-gallery">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the event album and moments captured..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {/* Cover Image Upload / URL */}
                <div className="form-group-gallery">
                  <label>Cover Image (URL or Upload)</label>
                  <input
                    type="text"
                    placeholder="https://... or upload below"
                    value={formData.coverImage}
                    onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                  />
                  <div className="gallery-upload-zone">
                    <label className="gallery-file-label">
                      {uploadingCover ? <Loader2 size={16} className="spin-icon" /> : <Upload size={16} />}
                      <span>{uploadingCover ? 'Uploading Cover...' : 'Upload Cover Image (Max 5MB)'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="gallery-file-input"
                        disabled={uploadingCover}
                        onChange={(e) => handleFileUpload(e, 'cover')}
                      />
                    </label>
                    {formData.coverImage && (
                      <img
                        src={formData.coverImage}
                        alt="Cover Preview"
                        className="gallery-preview-thumb"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>
                </div>

                {/* Featured Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="album-is-featured"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="album-is-featured" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    Feature on Homepage Carousel & Main Banner
                  </label>
                </div>

                {/* Photos List Sub-section */}
                <div className="photos-section">
                  <div className="photos-section-header">
                    <h4>Album Photos ({formData.photos.length})</h4>
                  </div>

                  {/* Add Photo Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Photo image URL..."
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                    <input
                      type="text"
                      placeholder="Caption / Description..."
                      value={newPhotoCaption}
                      onChange={(e) => setNewPhotoCaption(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddPhotoByUrl}
                      disabled={!newPhotoUrl.trim()}
                    >
                      Add URL
                    </Button>
                  </div>

                  {/* Upload photo file directly */}
                  <div style={{ marginTop: '6px' }}>
                    <label className="gallery-file-label" style={{ display: 'inline-flex', width: 'fit-content' }}>
                      {uploadingPhoto ? <Loader2 size={15} className="spin-icon" /> : <Upload size={15} />}
                      <span>{uploadingPhoto ? 'Uploading Photo...' : 'Upload Photo from Device (Max 5MB)'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="gallery-file-input"
                        disabled={uploadingPhoto}
                        onChange={(e) => handleFileUpload(e, 'photo')}
                      />
                    </label>
                  </div>

                  {/* List of existing photos */}
                  {formData.photos.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                      {formData.photos.map((p, idx) => (
                        <div key={p.id || idx} className="photo-row-item">
                          <img src={p.url} alt={p.caption || 'Photo'} className="photo-row-thumb" onError={(e) => { e.target.style.display = 'none'; }} />
                          <div style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                            {p.caption || 'No caption'}
                          </div>
                          <div style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                            {p.url}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '4px' }}
                            title="Remove Photo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="gallery-modal-footer">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || !formData.eventName.trim()}
                >
                  {submitting ? 'Saving...' : (editingAlbum ? 'Save Changes' : 'Create Album')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && albumToDelete && (
        <div className="gallery-modal-overlay" onClick={() => !deleting && setDeleteModalOpen(false)}>
          <div className="gallery-modal-dialog" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="gallery-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b6b' }}>
                <AlertCircle size={20} /> Confirm Deletion
              </h3>
            </div>
            <div className="gallery-modal-body">
              <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                Are you sure you want to delete album <strong>"{albumToDelete.eventName}"</strong>?
              </p>
              <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                This action is permanent and will remove the album along with its associated photo gallery records.
              </p>
            </div>
            <div className="gallery-modal-footer">
              <Button
                variant="ghost"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Album'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

