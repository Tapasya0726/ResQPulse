const express = require('express');
const Ambulance = require('../models/Ambulance');
const { attachDistance, normalizeLocation } = require('../utils/geo');
const router = express.Router();

// GET /api/ambulances/nearby
router.get('/nearby', async (req, res) => {
  try {
    const origin = normalizeLocation(req.query);
    const ambulances = await Ambulance.find({ status: 'available' }).lean();
    const ranked = origin ? attachDistance(ambulances, origin) : ambulances;
    res.json({ ambulances: ranked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ambulances (all ambulances for ambulance/hospital dashboards)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const ambulances = await Ambulance.find(filter).sort({ vehicleNumber: 1 });
    res.json({ ambulances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status, location } = req.body;
    const update = {};
    if (status !== undefined) update.status = status;
    if (location !== undefined) {
      const normalized = normalizeLocation(location);
      if (!normalized) return res.status(400).json({ error: 'Valid location is required' });
      update.location = normalized;
    }

    const ambulance = await Ambulance.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!ambulance) return res.status(404).json({ error: 'Ambulance not found' });
    res.json({ success: true, ambulance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ambulances/:id
router.get('/:id', async (req, res) => {
  try {
    const ambulance = await Ambulance.findById(req.params.id);
    if (!ambulance) return res.status(404).json({ error: 'Ambulance not found' });
    res.json({ ambulance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
