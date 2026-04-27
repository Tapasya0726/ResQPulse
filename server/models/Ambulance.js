const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true, unique: true },
  driverName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  type: { type: String, enum: ['ALS', 'BLS', 'NEO'], required: true },
  status: { type: String, enum: ['available', 'en_route', 'busy', 'maintenance'], default: 'available' },
  location: {
    lat: Number,
    lng: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
