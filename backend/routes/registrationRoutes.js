import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const registrationsFilePath = path.join(__dirname, '..', 'data', 'registrations.json');

// POST /api/registrations (Phase 1 basic structure & validation foundation)
router.post('/', async (req, res) => {
  try {
    const { participantName, email, phone, eventId } = req.body;

    // Basic input check
    if (!participantName || !email || !phone || !eventId) {
      return res.status(400).json({
        success: false,
        message: 'All fields (participantName, email, phone, eventId) are required'
      });
    }

    const newRegistration = {
      id: `FST-${Date.now().toString().slice(-6)}`,
      participantName: participantName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      eventId,
      registeredAt: new Date().toISOString()
    };

    // Safe read & write
    let registrations = [];
    try {
      const raw = await fs.readFile(registrationsFilePath, 'utf-8');
      registrations = JSON.parse(raw);
    } catch {
      registrations = [];
    }

    registrations.push(newRegistration);
    await fs.writeFile(registrationsFilePath, JSON.stringify(registrations, null, 2));

    return res.status(201).json({
      success: true,
      message: 'Registration recorded successfully',
      data: newRegistration
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to record registration',
      error: error.message
    });
  }
});

// GET /api/registrations (helper to inspect registrations)
router.get('/', async (req, res) => {
  try {
    const raw = await fs.readFile(registrationsFilePath, 'utf-8');
    const registrations = JSON.parse(raw);
    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to read registrations',
      error: error.message
    });
  }
});

export default router;

