import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsFilePath = path.join(__dirname, '..', 'data', 'events.json');

// Safe file reader helper
async function readEventsFile() {
  try {
    const rawData = await fs.readFile(eventsFilePath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading events.json:', error.message);
    throw new Error('Unable to read events data');
  }
}

// GET /api/events
export async function getAllEvents(req, res) {
  try {
    const events = await readEventsFile();
    const { category, featured } = req.query;

    let filteredEvents = events;

    if (category && category !== 'All') {
      filteredEvents = filteredEvents.filter(
        (e) => e.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (featured === 'true') {
      filteredEvents = filteredEvents.filter((e) => e.isFeatured === true);
    }

    res.status(200).json({
      success: true,
      count: filteredEvents.length,
      data: filteredEvents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve events',
      error: error.message
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
        message: `Event with id '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve event details',
      error: error.message
    });
  }
}
