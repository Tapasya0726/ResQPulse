const mongoose = require('mongoose');

const emergencyCaseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'en_route', 'resolved', 'cancelled'], 
    default: 'pending' 
  },
  location: {
    lat: Number,
    lng: Number
  },
  ambulance: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', default: null },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null },
  incidentDetails: {
    emergencyType: [String],
    severity: String,
    conscious: Boolean,
    breathing: Boolean,
    bleeding: Boolean,
    patientCount: String,
    ageGroup: String,
    conditions: [String],
    allergies: [String],
    medications: String,
    notes: String
  },
  vitals: {
    heartRate: Number,
    spO2: Number,
    bp: String,
    temperature: Number,
    gcs: String,
    ecg: String,
    timestamp: Date
  },
  acceptedAt: Date,
  resolvedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('EmergencyCase', emergencyCaseSchema);
