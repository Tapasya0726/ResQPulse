require('dotenv').config();
const mongoose = require('mongoose');
const Ambulance = require('./models/Ambulance');
const Hospital = require('./models/Hospital');
const User = require('./models/User');
const { isAtlasMongoUri, maskMongoUri, validateMongoUri } = require('./utils/mongoConfig');

const MONGO_URI = process.env.MONGODB_URI;

const mongoValidation = validateMongoUri(MONGO_URI);
if (!mongoValidation.ok) {
  console.error(`[Seed] ${mongoValidation.reason}`);
  console.error(`[Seed] ${mongoValidation.hint}`);
  process.exit(1);
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[Seed] Connected to MongoDB (${isAtlasMongoUri(MONGO_URI) ? 'Atlas shared cluster' : 'custom target'})`);
    console.log(`[Seed] Target: ${maskMongoUri(MONGO_URI)}`);

    // Clear existing data
    await Ambulance.deleteMany({});
    await Hospital.deleteMany({});
    console.log('[Seed] Cleared existing ambulances and hospitals');

    // Seed Ambulances
    const ambulances = await Ambulance.insertMany([
      {
        vehicleNumber: 'DL-AMB-2047',
        driverName: 'Rajesh Kumar',
        contactNumber: '+91 98765 43210',
        type: 'ALS',
        status: 'available',
        location: { lat: 28.6280, lng: 77.2190 }
      },
      {
        vehicleNumber: 'DL-AMB-1193',
        driverName: 'Suresh Yadav',
        contactNumber: '+91 98200 22345',
        type: 'BLS',
        status: 'available',
        location: { lat: 28.6100, lng: 77.2300 }
      },
      {
        vehicleNumber: 'DL-AMB-3381',
        driverName: 'Manoj Singh',
        contactNumber: '+91 99300 33456',
        type: 'ALS',
        status: 'available',
        location: { lat: 28.6050, lng: 77.2050 }
      },
      {
        vehicleNumber: 'DL-AMB-0056',
        driverName: 'Vikram Nair',
        contactNumber: '+91 97400 44567',
        type: 'NEO',
        status: 'available',
        location: { lat: 28.6200, lng: 77.1950 }
      },
      {
        vehicleNumber: 'DL-AMB-7724',
        driverName: 'Deepak Verma',
        contactNumber: '+91 96500 55678',
        type: 'BLS',
        status: 'available',
        location: { lat: 28.6350, lng: 77.2250 }
      },
      {
        vehicleNumber: 'DL-AMB-4490',
        driverName: 'Arjun Das',
        contactNumber: '+91 95600 66789',
        type: 'ALS',
        status: 'available',
        location: { lat: 28.5950, lng: 77.2150 }
      },
    ]);
    console.log(`[Seed] Inserted ${ambulances.length} ambulances`);

    // Seed Hospitals
    const hospitals = await Hospital.insertMany([
      {
        name: 'Apollo Hospital, Sarita Vihar',
        address: 'Sarita Vihar, New Delhi - 110076',
        location: { lat: 28.5355, lng: 77.2910 },
        bedsAvailable: 12,
        totalBeds: 120,
        icuBedsAvailable: 4,
        erStatus: 'open',
        specialties: ['Multi-specialty', 'Cardiology', 'Neurology', 'Orthopedics'],
        rating: 4.8
      },
      {
        name: 'Max Super Specialty',
        address: 'Saket, New Delhi - 110017',
        location: { lat: 28.5272, lng: 77.2165 },
        bedsAvailable: 6,
        totalBeds: 95,
        icuBedsAvailable: 1,
        erStatus: 'limited',
        specialties: ['Cardiac', 'Neuro', 'Oncology'],
        rating: 4.6
      },
      {
        name: 'Fortis Hospital',
        address: 'Vasant Kunj, New Delhi - 110070',
        location: { lat: 28.5196, lng: 77.1599 },
        bedsAvailable: 18,
        totalBeds: 110,
        icuBedsAvailable: 5,
        erStatus: 'open',
        specialties: ['Trauma Level I', 'Emergency', 'Surgery'],
        rating: 4.9
      },
      {
        name: 'AIIMS Trauma Centre',
        address: 'Ansari Nagar, New Delhi - 110029',
        location: { lat: 28.5672, lng: 77.2100 },
        bedsAvailable: 24,
        totalBeds: 160,
        icuBedsAvailable: 8,
        erStatus: 'open',
        specialties: ['Govt', 'All cases', 'Trauma', 'Emergency'],
        rating: 4.7
      },
    ]);
    console.log(`[Seed] Inserted ${hospitals.length} hospitals`);

    console.log('[Seed] Database seeded successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error:', err.message);
    process.exit(1);
  }
}

seed();
