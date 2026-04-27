/**
 * Socket.io event handlers for real-time features:
 * - Ambulance GPS location updates
 * - SOS alerts broadcast
 * - Live vitals streaming
 */
module.exports = function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Ambulance updates its GPS location
    socket.on('update-location', (data) => {
      // data = { ambulanceId, lat, lng }
      console.log(`[Socket] Location update from ${data.ambulanceId}: ${data.lat}, ${data.lng}`);
      // Broadcast to all other clients
      socket.broadcast.emit('location-changed', {
        ambulanceId: data.ambulanceId,
        lat: data.lat,
        lng: data.lng,
        timestamp: new Date()
      });
    });

    // Ambulance joins a specific emergency room
    socket.on('join-emergency', (data) => {
      // data = { emergencyId }
      socket.join(`emergency-${data.emergencyId}`);
      console.log(`[Socket] ${socket.id} joined emergency-${data.emergencyId}`);
    });

    // Leave emergency room
    socket.on('leave-emergency', (data) => {
      socket.leave(`emergency-${data.emergencyId}`);
      console.log(`[Socket] ${socket.id} left emergency-${data.emergencyId}`);
    });

    // Vitals update from ambulance
    socket.on('vitals-update', (data) => {
      // data = { emergencyId, heartRate, spO2, bp, temperature }
      console.log(`[Socket] Vitals update for emergency ${data.emergencyId}`);
      io.emit('vitals-changed', data);
    });

    // Status change
    socket.on('status-change', (data) => {
      // data = { emergencyId, status }
      console.log(`[Socket] Status change for emergency ${data.emergencyId}: ${data.status}`);
      io.emit('emergency-status-changed', data);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
};
