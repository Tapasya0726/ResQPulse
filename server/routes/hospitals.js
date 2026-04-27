const express = require('express');
const Hospital = require('../models/Hospital');
const { attachDistance, normalizeLocation } = require('../utils/geo');
const router = express.Router();

// GET /api/hospitals/nearby
router.get('/nearby', async (req, res) => {
  try {
    const origin = normalizeLocation(req.query);
    const hospitals = await Hospital.find({ erStatus: { $ne: 'closed' } }).lean();
    const ranked = origin
      ? attachDistance(hospitals, origin)
      : hospitals.sort((a, b) => (b.bedsAvailable || 0) - (a.bedsAvailable || 0));
    res.json({ hospitals: ranked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hospitals
router.get('/', async (req, res) => {
  try {
    const hospitals = await Hospital.find().sort({ bedsAvailable: -1, name: 1 });
    res.json({ hospitals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// We'll attach the io instance from the main server
let io;
router.setIo = (ioInstance) => { io = ioInstance; };

// GET /api/hospitals/:id
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json({ hospital });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hospitals/:id/resources
router.put('/:id/resources', async (req, res) => {
  try {
    const { bedsAvailable, totalBeds, icuBedsAvailable, erStatus, specialties } = req.body;
    const update = {};
    if (bedsAvailable !== undefined) update.bedsAvailable = Math.max(0, Number(bedsAvailable) || 0);
    if (totalBeds !== undefined) update.totalBeds = Math.max(0, Number(totalBeds) || 0);
    if (icuBedsAvailable !== undefined) update.icuBedsAvailable = Math.max(0, Number(icuBedsAvailable) || 0);
    if (erStatus !== undefined) update.erStatus = erStatus;
    if (specialties !== undefined) update.specialties = Array.isArray(specialties) ? specialties : [];

    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    if (io) {
      io.emit('hospital-updated', { hospital });
    }

    res.json({ success: true, hospital });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
