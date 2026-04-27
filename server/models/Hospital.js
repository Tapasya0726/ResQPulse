const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    lat: Number,
    lng: Number
  },
  bedsAvailable: { type: Number, default: 0 },
  totalBeds: { type: Number, default: 0 },
  icuBedsAvailable: { type: Number, default: 0 },
  erStatus: { type: String, enum: ['open', 'limited', 'closed'], default: 'open' },
  specialties: [{ type: String }],
  rating: { type: Number, default: 5.0 }
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);
