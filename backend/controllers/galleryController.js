import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const galleryFilePath = path.join(__dirname, '..', 'data', 'gallery.json');
const uploadsDir = path.join(__dirname, '..', 'uploads', 'gallery');

// Ensure uploads directory exists
if (!fsSync.existsSync(uploadsDir)) {
  fsSync.mkdirSync(uploadsDir, { recursive: true });
}

// Serialized write queue for atomic gallery file operations
let galleryWriteQueue = Promise.resolve();
function enqueueGalleryWrite(operation) {
  const next = galleryWriteQueue.then(operation, operation);
  galleryWriteQueue = next.catch(() => {});
  return next;
}

async function readGalleryFile() {
  try {
    const raw = await fs.readFile(galleryFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(galleryFilePath, '[]', 'utf-8');
      return [];
    }
    console.error('[Gallery Controller] Error reading gallery.json:', error.message);
    return [];
  }
}

async function writeGalleryFile(albums) {
  return enqueueGalleryWrite(async () => {
    if (!Array.isArray(albums)) {
      throw new Error('Gallery dataset must be an array');
    }
    const jsonString = JSON.stringify(albums, null, 2);
    // Syntax verification
    JSON.parse(jsonString);

    const tmpPath = `${galleryFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await fs.writeFile(tmpPath, jsonString, 'utf-8');
      await fs.rename(tmpPath, galleryFilePath);
    } catch (err) {
      try {
        await fs.unlink(tmpPath);
      } catch {}
      throw err;
    }
  });
}

/**
 * GET /api/gallery
 * Public: Supports query params category and featured.
 */
export async function getAllGalleryAlbums(req, res) {
  try {
    const albums = await readGalleryFile();
    const { category, featured } = req.query;

    let filtered = [...albums];

    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      filtered = filtered.filter(
        (a) => (a.category || '').toLowerCase() === category.trim().toLowerCase()
      );
    }

    if (featured !== undefined) {
      const isFeat = featured === 'true' || featured === '1';
      filtered = filtered.filter((a) => Boolean(a.isFeatured) === isFeat);
    }

    // Default chronological sorting (most recent first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve gallery records',
      error: error.message
    });
  }
}

/**
 * GET /api/gallery/:id
 * Public: Retrieves a single gallery album.
 */
export async function getGalleryAlbumById(req, res) {
  try {
    const { id } = req.params;
    const albums = await readGalleryFile();
    const album = albums.find((a) => a.id === id);

    if (!album) {
      return res.status(404).json({
        success: false,
        message: `Gallery album '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      data: album
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve gallery album',
      error: error.message
    });
  }
}

/**
 * POST /api/gallery
 * Manager authorized: Creates a new gallery album.
 */
export async function createGalleryAlbum(req, res) {
  try {
    const {
      eventName,
      category,
      date,
      description,
      coverImage,
      photos,
      isFeatured
    } = req.body;

    if (!eventName || !category || !date) {
      return res.status(400).json({
        success: false,
        message: 'Event name, category, and date are required to create a gallery album'
      });
    }

    const albums = await readGalleryFile();
    const newId = `gal-${Date.now().toString(36).slice(-4)}-${Math.random().toString(36).slice(2, 5)}`;

    const normalizedPhotos = Array.isArray(photos) ? photos.map((p, idx) => ({
      id: p.id || `p-${Date.now()}-${idx}`,
      url: p.url,
      caption: p.caption || ''
    })) : [];

    const newAlbum = {
      id: newId,
      eventName: eventName.trim(),
      category: category.trim(),
      date: date.trim(),
      description: (description || '').trim(),
      coverImage: coverImage ? coverImage.trim() : (normalizedPhotos[0]?.url || ''),
      photos: normalizedPhotos,
      isFeatured: Boolean(isFeatured),
      createdAt: new Date().toISOString(),
      createdBy: req.user?.email || 'manager'
    };

    albums.unshift(newAlbum);
    await writeGalleryFile(albums);

    res.status(201).json({
      success: true,
      message: 'Gallery album created successfully',
      data: newAlbum
    });
  } catch (error) {
    console.error('[Gallery Controller] Create album error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create gallery album',
      error: error.message
    });
  }
}

/**
 * PUT /api/gallery/:id
 * Manager authorized: Updates gallery metadata or photos.
 */
export async function updateGalleryAlbum(req, res) {
  try {
    const { id } = req.params;
    const albums = await readGalleryFile();
    const index = albums.findIndex((a) => a.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: `Gallery album '${id}' not found`
      });
    }

    const existing = albums[index];
    const {
      eventName,
      category,
      date,
      description,
      coverImage,
      photos,
      isFeatured
    } = req.body;

    const updatedAlbum = {
      ...existing,
      eventName: eventName !== undefined ? eventName.trim() : existing.eventName,
      category: category !== undefined ? category.trim() : existing.category,
      date: date !== undefined ? date.trim() : existing.date,
      description: description !== undefined ? description.trim() : existing.description,
      coverImage: coverImage !== undefined ? coverImage.trim() : existing.coverImage,
      photos: Array.isArray(photos) ? photos : existing.photos,
      isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : existing.isFeatured,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.email || 'manager'
    };

    albums[index] = updatedAlbum;
    await writeGalleryFile(albums);

    res.status(200).json({
      success: true,
      message: 'Gallery album updated successfully',
      data: updatedAlbum
    });
  } catch (error) {
    console.error('[Gallery Controller] Update album error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update gallery album',
      error: error.message
    });
  }
}

/**
 * DELETE /api/gallery/:id
 * Manager authorized: Deletes a gallery album.
 */
export async function deleteGalleryAlbum(req, res) {
  try {
    const { id } = req.params;
    const albums = await readGalleryFile();
    const index = albums.findIndex((a) => a.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: `Gallery album '${id}' not found`
      });
    }

    const removed = albums.splice(index, 1)[0];
    await writeGalleryFile(albums);

    res.status(200).json({
      success: true,
      message: `Gallery album '${removed.eventName}' deleted successfully`,
      deletedId: id
    });
  } catch (error) {
    console.error('[Gallery Controller] Delete album error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete gallery album',
      error: error.message
    });
  }
}

/**
 * POST /api/gallery/upload
 * Manager authorized: Validates and saves an uploaded image.
 * Validates file type, size, prevents path traversal, and generates unique name.
 */
export async function uploadGalleryImage(req, res) {
  try {
    const { imageBase64, originalFilename } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided. Please provide imageBase64.'
      });
    }

    // Match Base64 pattern: data:image/(png|jpeg|jpg|webp);base64,...
    const matches = imageBase64.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    let ext = 'jpg';
    let base64Data = imageBase64;

    if (matches) {
      ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
      base64Data = matches[2];
    } else if (originalFilename) {
      const parts = path.extname(originalFilename).toLowerCase().replace('.', '');
      if (['jpg', 'jpeg', 'png', 'webp'].includes(parts)) {
        ext = parts === 'jpeg' ? 'jpg' : parts;
      }
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // 1. Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Image exceeds maximum allowed size of 5MB (Received: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB)`
      });
    }

    // 2. Validate magic bytes to verify legitimate image format
    let validMime = false;
    if (buffer.length > 4) {
      const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      const isWebp = buffer.length > 12 &&
        buffer.toString('utf8', 0, 4) === 'RIFF' &&
        buffer.toString('utf8', 8, 12) === 'WEBP';

      if (isJpeg || isPng || isWebp) {
        validMime = true;
        if (isJpeg) ext = 'jpg';
        if (isPng) ext = 'png';
        if (isWebp) ext = 'webp';
      }
    }

    if (!validMime) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file content: only authentic JPEG, PNG, or WEBP images are supported.'
      });
    }

    // 3. Generate safe unique filename (prevent path traversal)
    const safeHash = crypto.randomBytes(12).toString('hex');
    const safeFilename = `gallery_${Date.now()}_${safeHash}.${ext}`;
    const destinationPath = path.join(uploadsDir, safeFilename);

    // Write file securely
    await fs.writeFile(destinationPath, buffer);

    const publicUrl = `/uploads/gallery/${safeFilename}`;

    res.status(201).json({
      success: true,
      message: 'Gallery image uploaded successfully',
      data: {
        url: publicUrl,
        filename: safeFilename,
        size: buffer.length,
        format: ext
      }
    });
  } catch (error) {
    console.error('[Gallery Controller] Image upload error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to upload gallery image',
      error: error.message
    });
  }
}
