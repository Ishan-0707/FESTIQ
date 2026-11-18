import express from 'express';
import {
  getAllGalleryAlbums,
  getGalleryAlbumById,
  createGalleryAlbum,
  updateGalleryAlbum,
  deleteGalleryAlbum,
  uploadGalleryImage
} from '../controllers/galleryController.js';
import { requireAuth, requireManager } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllGalleryAlbums);
router.get('/:id', getGalleryAlbumById);

// Manager authorized gallery administration routes
router.post('/', requireAuth, requireManager, createGalleryAlbum);
router.put('/:id', requireAuth, requireManager, updateGalleryAlbum);
router.delete('/:id', requireAuth, requireManager, deleteGalleryAlbum);
router.post('/upload', requireAuth, requireManager, uploadGalleryImage);

export default router;

