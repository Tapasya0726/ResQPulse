/**
 * Socket.io Client Service
 * Manages WebSocket connection and event listeners
 */

import { io } from 'socket.io-client';

let socket = null;
let listeners = {};

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5050';

export function connectSocket() {
  return new Promise((resolve) => {
    if (socket && socket.connected) {
      resolve(socket);
      return;
    }

    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
    });
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      reattachListeners();
      resolve(socket);
    });
    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      resolve(socket);
    });
    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });
  });
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Subscribe to an event
export function onSocketEvent(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
  
  if (socket && socket.connected) {
    socket.on(event, callback);
  }
  
  // Return unsubscribe function
  return () => {
    if (socket) socket.off(event, callback);
    listeners[event] = (listeners[event] || []).filter(cb => cb !== callback);
  };
}

// Emit an event
export function emitSocketEvent(event, data) {
  if (socket && socket.connected) {
    socket.emit(event, data);
  } else {
    console.warn('[Socket] Not connected, cannot emit:', event);
  }
}

// Re-attach all listeners when socket reconnects
export function reattachListeners() {
  if (!socket) return;
  Object.entries(listeners).forEach(([event, cbs]) => {
    cbs.forEach(cb => {
      socket.off(event, cb);
      socket.on(event, cb);
    });
  });
}

// Join an emergency room for targeted updates
export function joinEmergency(emergencyId) {
  emitSocketEvent('join-emergency', { emergencyId });
}

// Leave an emergency room
export function leaveEmergency(emergencyId) {
  emitSocketEvent('leave-emergency', { emergencyId });
}

// Send ambulance location update
export function sendLocationUpdate(ambulanceId, lat, lng) {
  emitSocketEvent('update-location', { ambulanceId, lat, lng });
}

// Send vitals update
export function sendVitalsUpdate(emergencyId, vitals) {
  emitSocketEvent('vitals-update', { emergencyId, ...vitals });
}
