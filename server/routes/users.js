const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const FIXED_OTP = process.env.DEV_OTP || '1234';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

// In-memory OTP store (phone -> otp)
const otpStore = {};

// POST /api/users/auth/send-otp
router.post('/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const otp = FIXED_OTP;
    otpStore[phone] = otp;

    console.log(`[OTP] Sent OTP ${otp} to ${phone}`);
    res.json({ success: true, message: 'OTP sent successfully', hint: `Use ${FIXED_OTP} in development` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/auth/verify-otp
router.post('/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });

    // Accept fixed OTP or the one we stored
    if (otp !== FIXED_OTP && otp !== otpStore[phone]) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    // Clean up
    delete otpStore[phone];

    // Find or create user
    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ phone });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id, phone: user.phone }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ 
      success: true, 
      token, 
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        age: user.age,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        emergencyContacts: user.emergencyContacts,
        isProfileComplete: !!(user.name && user.age && user.gender)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware to verify JWT
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// PUT /api/users/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, age, gender, bloodGroup, emergencyContacts, lastLocation } = req.body;
    
    const update = {};
    if (name !== undefined) update.name = name;
    if (age !== undefined) update.age = Number(age);
    if (gender !== undefined) update.gender = gender;
    if (bloodGroup !== undefined) update.bloodGroup = bloodGroup;
    if (emergencyContacts !== undefined) update.emergencyContacts = emergencyContacts;
    if (lastLocation !== undefined) update.lastLocation = lastLocation;

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ 
      success: true, 
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        age: user.age,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        emergencyContacts: user.emergencyContacts,
        lastLocation: user.lastLocation,
        isProfileComplete: !!(user.name && user.age && user.gender)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        age: user.age,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        emergencyContacts: user.emergencyContacts,
        lastLocation: user.lastLocation,
        isProfileComplete: !!(user.name && user.age && user.gender)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
module.exports.JWT_SECRET = JWT_SECRET;
