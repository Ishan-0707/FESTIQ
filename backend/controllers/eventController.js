import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsFilePath = path.join(__dirname, '..', 'data', 'events.json');

// Safe file reader helper with validation
async function readEventsFile() {
  try {
    const rawData = await fs.readFile(eventsFilePath, 'utf-8');
    const parsed = JSON.parse(rawData);
    if (!Array.isArray(parsed)) {
      throw new Error('Events data must be an array');
    }
    return parsed;
  } catch (error) {
    console.error('[Event Controller] Error reading events.json:', error.message);
    throw new Error('Unable to read events data');
  }
}

// GET /api/events
// Supports query params: category, featured, search
export async function getAllEvents(req, res) {
  try {
    const events = await readEventsFile();
    const { category, featured, search } = req.query;

    let filteredEvents = events;

    // Category filter
    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      filteredEvents = filteredEvents.filter(
        (e) => (e.category || '').toLowerCase() === category.trim().toLowerCase()
      );
    }

    // Featured filter
    if (featured !== undefined) {
      const isFeat = featured === 'true' || featured === '1';
      filteredEvents = filteredEvents.filter((e) => Boolean(e.isFeatured || e.featured) === isFeat);
    }

    // Search query filter (preparation for Phase 4)
    if (search && search.trim() !== '') {
      const query = search.trim().toLowerCase();
      filteredEvents = filteredEvents.filter((e) =>
        (e.title || '').toLowerCase().includes(query) ||
        (e.venue || '').toLowerCase().includes(query) ||
        (e.tagline || '').toLowerCase().includes(query) ||
        (e.description || '').toLowerCase().includes(query)
      );
    }

    res.status(200).json({
      success: true,
      count: filteredEvents.length,
      data: filteredEvents,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve events',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// GET /api/events/:id
export async function getEventById(req, res) {
  try {
    const { id } = req.params;
    const events = await readEventsFile();
    const event = events.find((e) => e.id === id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: `Event with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: event,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve event details',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
