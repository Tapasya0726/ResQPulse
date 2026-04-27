/**
 * API Service Layer
 * Centralized HTTP client for all backend communication
 */

const API_ROOT = (process.env.REACT_APP_API_URL || 'http://localhost:5050/api').replace(/\/$/, '');

function getToken() {
  return localStorage.getItem('resqpulse_token');
}

function setToken(token) {
  localStorage.setItem('resqpulse_token', token);
}

function clearToken() {
  localStorage.removeItem('resqpulse_token');
}

function getStoredUser() {
  const raw = localStorage.getItem('resqpulse_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function setStoredUser(user) {
  localStorage.setItem('resqpulse_user', JSON.stringify(user));
}

function clearStoredUser() {
  localStorage.removeItem('resqpulse_user');
}

export function logout() {
  clearToken();
  clearStoredUser();
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_ROOT}${path}`, opts);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

// ── User APIs ──────────────────────────────────────────────
export async function sendOtp(phone) {
  return request('POST', '/users/auth/send-otp', { phone });
}

export async function verifyOtp(phone, otp) {
  const data = await request('POST', '/users/auth/verify-otp', { phone, otp });
  if (data.token) {
    setToken(data.token);
    setStoredUser(data.user);
  }
  return data;
}

export async function updateProfile(profileData) {
  const data = await request('PUT', '/users/profile', profileData);
  if (data.user) setStoredUser(data.user);
  return data;
}

export async function getMe() {
  return request('GET', '/users/me');
}

// ── Ambulance APIs ─────────────────────────────────────────
export async function getNearbyAmbulances() {
  return request('GET', '/ambulances/nearby');
}

export async function getNearbyAmbulancesByLocation(location) {
  const params = new URLSearchParams();
  if (location?.lat !== undefined) params.set('lat', location.lat);
  if (location?.lng !== undefined) params.set('lng', location.lng);
  return request('GET', `/ambulances/nearby?${params.toString()}`);
}

export async function getAllAmbulances() {
  return request('GET', '/ambulances');
}

// ── Hospital APIs ──────────────────────────────────────────
export async function getNearbyHospitals() {
  return request('GET', '/hospitals/nearby');
}

export async function getNearbyHospitalsByLocation(location) {
  const params = new URLSearchParams();
  if (location?.lat !== undefined) params.set('lat', location.lat);
  if (location?.lng !== undefined) params.set('lng', location.lng);
  return request('GET', `/hospitals/nearby?${params.toString()}`);
}

export async function getAllHospitals() {
  return request('GET', '/hospitals');
}

export async function updateHospitalResources(id, resources) {
  return request('PUT', `/hospitals/${id}/resources`, resources);
}

// ── Emergency APIs ─────────────────────────────────────────
export async function triggerSOS(userId, location) {
  return request('POST', '/emergencies/sos', { userId, location });
}

export async function getActiveCases() {
  return request('GET', '/emergencies/active');
}

export async function getAllCases() {
  return request('GET', '/emergencies');
}

export async function getCase(id) {
  return request('GET', `/emergencies/${id}`);
}

export async function acceptEmergency(caseId, ambulanceId) {
  return request('POST', `/emergencies/${caseId}/accept`, { ambulanceId });
}

export async function setHospital(caseId, hospitalId) {
  return request('PUT', `/emergencies/${caseId}/hospital`, { hospitalId });
}

export async function updateIncident(caseId, incidentDetails) {
  return request('PUT', `/emergencies/${caseId}/incident`, { incidentDetails });
}

export async function updateVitals(caseId, vitals) {
  return request('PUT', `/emergencies/${caseId}/vitals`, { vitals });
}

export async function resolveEmergency(caseId, resolution = 'resolved') {
  return request('POST', `/emergencies/${caseId}/resolve`, { resolution });
}

export async function getUserCases(userId) {
  return request('GET', `/emergencies/user/${userId}`);
}

// ── Health Check ───────────────────────────────────────────
export async function healthCheck() {
  return request('GET', '/health');
}

// ── Auth Utilities ─────────────────────────────────────────

export function isLoggedIn() {
  return !!getToken();
}

export { getToken, getStoredUser };
