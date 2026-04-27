const express = require('express');
const EmergencyCase = require('../models/EmergencyCase');
const Ambulance = require('../models/Ambulance');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { attachDistance, normalizeLocation } = require('../utils/geo');
const router = express.Router();

// We'll attach the io instance from the main server
let io;
router.setIo = (ioInstance) => { io = ioInstance; };

// POST /api/emergencies/sos — Create a new emergency case
router.post('/sos', async (req, res) => {
  try {
    const { userId, location } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const caseLocation = normalizeLocation(location) || user.lastLocation;
    if (!caseLocation) return res.status(400).json({ error: 'Valid location is required' });

    user.lastLocation = caseLocation;
    await user.save();

    const availableAmbulances = await Ambulance.find({ status: 'available' }).lean();
    const openHospitals = await Hospital.find({ erStatus: { $ne: 'closed' } }).lean();
    const ambulance = attachDistance(availableAmbulances, caseLocation)[0] || null;
    const hospital =
      attachDistance(openHospitals, caseLocation)
        .sort((a, b) => {
          const distanceDelta = (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999);
          if (Math.abs(distanceDelta) > 2) return distanceDelta;
          return (b.bedsAvailable || 0) - (a.bedsAvailable || 0);
        })[0] || null;

    const emergencyCase = await EmergencyCase.create({
      user: userId,
      location: caseLocation,
      status: 'pending',
      ambulance: ambulance?._id || null,
      hospital: hospital?._id || null,
    });

    // Populate the case for the response
    const populated = await EmergencyCase.findById(emergencyCase._id)
      .populate('user')
      .populate('ambulance')
      .populate('hospital');

    // If an ambulance was assigned, mark it en_route
    if (ambulance) {
      await Ambulance.findByIdAndUpdate(ambulance._id, { status: 'en_route' });
    }

    // Emit SOS alert to all connected clients
    if (io) {
      io.emit('sos-alert', { 
        emergencyCase: populated,
        message: `New SOS from ${populated.user?.name || 'Unknown'}!`
      });
    }

    console.log(`[SOS] New emergency case ${emergencyCase._id} created`);
    res.json({ success: true, emergencyCase: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/emergencies — List all emergency cases
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const cases = await EmergencyCase.find(filter)
      .populate('user')
      .populate('ambulance')
      .populate('hospital')
      .sort({ createdAt: -1 });

    res.json({ cases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/emergencies/active — Get active cases (not resolved/cancelled)
router.get('/active', async (req, res) => {
  try {
    const cases = await EmergencyCase.find({ 
      status: { $nin: ['resolved', 'cancelled'] } 
    })
      .populate('user')
      .populate('ambulance')
      .populate('hospital')
      .sort({ createdAt: -1 });

    res.json({ cases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/emergencies/user/:userId — list cases for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const cases = await EmergencyCase.find({ user: req.params.userId })
      .populate('user')
      .populate('ambulance')
      .populate('hospital')
      .sort({ createdAt: -1 });

    res.json({ cases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/emergencies/:id
router.get('/:id', async (req, res) => {
  try {
    const emergencyCase = await EmergencyCase.findById(req.params.id)
      .populate('user')
      .populate('ambulance')
      .populate('hospital');

    if (!emergencyCase) return res.status(404).json({ error: 'Case not found' });
    res.json({ emergencyCase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/emergencies/:id/accept — Ambulance accepts the case
router.post('/:id/accept', async (req, res) => {
  try {
    const { ambulanceId } = req.body;
    const emergencyCase = await EmergencyCase.findById(req.params.id);
    if (!emergencyCase) return res.status(404).json({ error: 'Case not found' });

    emergencyCase.status = 'accepted';
    emergencyCase.acceptedAt = new Date();
    
    let assignedAmbulanceId = ambulanceId || emergencyCase.ambulance;
    if (!assignedAmbulanceId) {
      const availableAmbulance = await Ambulance.findOne({ status: 'available' }).sort({ updatedAt: 1 });
      assignedAmbulanceId = availableAmbulance?._id;
    }

    if (assignedAmbulanceId) {
      emergencyCase.ambulance = assignedAmbulanceId;
      await Ambulance.findByIdAndUpdate(assignedAmbulanceId, { status: 'en_route' });
    }

    await emergencyCase.save();

    const populated = await EmergencyCase.findById(emergencyCase._id)
      .populate('user')
      .populate('ambulance')
      .populate('hospital');

    if (io) {
      io.emit('emergency-accepted', { emergencyCase: populated });
    }

    res.json({ success: true, emergencyCase: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/emergencies/:id/hospital — Set destination hospital
router.put('/:id/hospital', async (req, res) => {
  try {
    const { hospitalId } = req.body;
    if (!hospitalId) return res.status(400).json({ error: 'hospitalId is required' });
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    const emergencyCase = await EmergencyCase.findByIdAndUpdate(
      req.params.id,
      { hospital: hospitalId },
      { new: true }
    ).populate('user').populate('ambulance').populate('hospital');

    if (!emergencyCase) return res.status(404).json({ error: 'Case not found' });

    if (io) {
      io.emit('hospital-assigned', { emergencyCase });
    }

    res.json({ success: true, emergencyCase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/emergencies/:id/incident — Update incident details
router.put('/:id/incident', async (req, res) => {
  try {
    const { incidentDetails } = req.body;
    if (!incidentDetails || typeof incidentDetails !== 'object') {
      return res.status(400).json({ error: 'incidentDetails object is required' });
    }
    const emergencyCase = await EmergencyCase.findByIdAndUpdate(
      req.params.id,
      { incidentDetails },
      { new: true, runValidators: true }
    ).populate('user').populate('ambulance').populate('hospital');

    if (!emergencyCase) return res.status(404).json({ error: 'Case not found' });

    if (io) {
      io.emit('incident-updated', { emergencyCase });
    }

    res.json({ success: true, emergencyCase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/emergencies/:id/vitals — Update patient vitals
router.put('/:id/vitals', async (req, res) => {
  try {
    const { vitals } = req.body;
    if (!vitals || typeof vitals !== 'object') {
      return res.status(400).json({ error: 'vitals object is required' });
    }
    const emergencyCase = await EmergencyCase.findByIdAndUpdate(
      req.params.id,
      { vitals: { ...vitals, timestamp: new Date() } },
      { new: true, runValidators: true }
    ).populate('user').populate('ambulance').populate('hospital');

    if (!emergencyCase) return res.status(404).json({ error: 'Case not found' });

    if (io) {
      io.emit('vitals-updated', { emergencyCase });
    }

    res.json({ success: true, emergencyCase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/emergencies/:id/resolve — Resolve or cancel emergency
router.post('/:id/resolve', async (req, res) => {
  try {
    const { resolution } = req.body; // 'resolved' or 'cancelled'
    if (resolution && !['resolved', 'cancelled'].includes(resolution)) {
      return res.status(400).json({ error: 'resolution must be resolved or cancelled' });
    }
    const emergencyCase = await EmergencyCase.findById(req.params.id);
    if (!emergencyCase) return res.status(404).json({ error: 'Case not found' });

    emergencyCase.status = resolution || 'resolved';
    emergencyCase.resolvedAt = new Date();
    await emergencyCase.save();

    // Free up the ambulance
    if (emergencyCase.ambulance) {
      await Ambulance.findByIdAndUpdate(emergencyCase.ambulance, { status: 'available' });
    }

    const populated = await EmergencyCase.findById(emergencyCase._id)
      .populate('user')
      .populate('ambulance')
      .populate('hospital');

    if (io) {
      io.emit('emergency-resolved', { emergencyCase: populated });
    }

    res.json({ success: true, emergencyCase: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
