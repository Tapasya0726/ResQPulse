require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const setupSocket = require('./socket');
const {
  isAtlasMongoUri,
  isLocalMongoUri,
  maskMongoUri,
  validateMongoUri,
} = require('./utils/mongoConfig');

// Import routes
const userRoutes = require('./routes/users');
const ambulanceRoutes = require('./routes/ambulances');
const hospitalRoutes = require('./routes/hospitals');
const emergencyRoutes = require('./routes/emergencies');

// Config
const PORT = Number(process.env.PORT || 5050);
const MONGO_URI = process.env.MONGODB_URI;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

const mongoValidation = validateMongoUri(MONGO_URI);
if (!mongoValidation.ok) {
  console.error(mongoValidation.reason);
  console.error(mongoValidation.hint);
  process.exit(1);
}

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Pass io to routes so they can emit events
emergencyRoutes.setIo(io);
hospitalRoutes.setIo(io);

// Middleware
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/emergencies', emergencyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mongoTarget: isAtlasMongoUri(MONGO_URI) ? 'atlas' : isLocalMongoUri(MONGO_URI) ? 'local' : 'remote'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Setup Socket handlers
setupSocket(io);

// Connect to MongoDB and start server
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
})
  .then(() => {
    console.log('═══════════════════════════════════════════════');
    console.log('  resQpulse Backend Server');
    console.log(`  MongoDB connected (${isAtlasMongoUri(MONGO_URI) ? 'Atlas shared cluster' : 'custom target'})`);
    console.log(`  Target: ${maskMongoUri(MONGO_URI)}`);
    console.log('═══════════════════════════════════════════════');
    
    server.listen(PORT, () => {
      console.log(`  HTTP server running on http://localhost:${PORT}`);
      console.log(`  Socket.io ready on ws://localhost:${PORT}`);
      console.log('  API endpoints:');
      console.log('     POST /api/users/auth/send-otp');
      console.log('     POST /api/users/auth/verify-otp');
      console.log('     PUT  /api/users/profile');
      console.log('     GET  /api/ambulances/nearby');
      console.log('     GET  /api/hospitals/nearby');
      console.log('     POST /api/emergencies/sos');
      console.log('     POST /api/emergencies/:id/accept');
      console.log('     PUT  /api/emergencies/:id/hospital');
      console.log('     PUT  /api/emergencies/:id/incident');
      console.log('     PUT  /api/emergencies/:id/vitals');
      console.log('     POST /api/emergencies/:id/resolve');
      console.log('═══════════════════════════════════════════════');
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    console.log('\nCheck server/.env MONGODB_URI, Atlas IP access, Atlas database user, and cluster reachability.');
    process.exit(1);
  });
