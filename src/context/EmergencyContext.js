import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { connectSocket, onSocketEvent, disconnectSocket } from '../services/socket';

const EmergencyContext = createContext(null);

export function useEmergency() {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error('useEmergency must be used within EmergencyProvider');
  return ctx;
}

export function EmergencyProvider({ children }) {
  // Auth state
  const [token, setToken] = useState(api.getToken());
  const [user, setUser] = useState(api.getStoredUser());
  const [isLoggedIn, setIsLoggedIn] = useState(!!api.getToken());

  // Data state
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [activeCases, setActiveCases] = useState([]);
  const [currentCase, setCurrentCase] = useState(null);

  // Real-time state
  const [ambulanceLocations, setAmbulanceLocations] = useState({});
  const [latestVitals, setLatestVitals] = useState(null);

  // Loading / error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);

  // ── Auth Actions ──────────────────────────────────────────
  const doLogout = useCallback(() => {
    api.logout();
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setCurrentCase(null);
  }, []);

  const sendOtp = useCallback(async (phone) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.sendOtp(phone);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(async (phone, otp) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.verifyOtp(phone, otp);
      setToken(result.token);
      setUser(result.user);
      setIsLoggedIn(true);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.updateProfile(profileData);
      setUser(result.user);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Restore Auth Session ───────────────────────────────
  useEffect(() => {
    const storedToken = api.getToken();
    const storedUser = api.getStoredUser();
    
    if (storedToken) {
      setToken(storedToken);
      setIsLoggedIn(true);
      
      if (storedUser) {
        setUser(storedUser);
      }
      
      // Refresh user profile from server
      api.getMe()
        .then(res => {
          if (res.user) {
            setUser(res.user);
          }
        })
        .catch(err => {
          console.error('[Context] Failed to refresh profile:', err);
          if (err.message && (err.message.includes('token') || err.message.includes('auth') || err.message.includes('401'))) {
            // Token might be invalid/expired
            doLogout();
          }
        });
    }
  }, [doLogout]);

  // Helper to update a case in activeCases list
  const updateCaseInState = useCallback((updatedCase) => {
    setActiveCases(prev => prev.map(c =>
      c._id === updatedCase._id ? updatedCase : c
    ));
    setCurrentCase(prev => (prev?._id === updatedCase._id ? updatedCase : prev));
  }, []);

  // ── Check backend health periodically ─────────────────────
  useEffect(() => {
    const check = () => {
      api.healthCheck()
        .then(() => setBackendConnected(true))
        .catch(() => setBackendConnected(false));
    };
    check();
    const id = setInterval(check, 5000); // Check every 5s
    return () => clearInterval(id);
  }, []);

  // ── Setup socket connection ───────────────────────────────
  useEffect(() => {
    if (!backendConnected) return;

    connectSocket().then(() => {
      console.log('[Context] Socket connected');
    });

    // Listen for real-time events
    const unsubs = [
      onSocketEvent('sos-alert', (data) => {
        console.log('[Context] SOS Alert received:', data);
        setActiveCases(prev => {
          const exists = prev.find(c => c._id === data.emergencyCase._id);
          if (exists) return prev;
          return [data.emergencyCase, ...prev];
        });
      }),
      onSocketEvent('emergency-accepted', (data) => {
        console.log('[Context] Emergency accepted:', data);
        updateCaseInState(data.emergencyCase);
      }),
      onSocketEvent('emergency-resolved', (data) => {
        console.log('[Context] Emergency resolved:', data);
        setActiveCases(prev => prev.filter(c => c._id !== data.emergencyCase._id));
        setCurrentCase(prev => (prev?._id === data.emergencyCase._id ? data.emergencyCase : prev));
      }),
      onSocketEvent('location-changed', (data) => {
        setAmbulanceLocations(prev => ({
          ...prev,
          [data.ambulanceId]: { lat: data.lat, lng: data.lng, timestamp: data.timestamp }
        }));
      }),
      onSocketEvent('vitals-changed', (data) => {
        setLatestVitals(data);
      }),
      onSocketEvent('vitals-updated', (data) => {
        updateCaseInState(data.emergencyCase);
      }),
      onSocketEvent('incident-updated', (data) => {
        updateCaseInState(data.emergencyCase);
      }),
      onSocketEvent('hospital-assigned', (data) => {
        updateCaseInState(data.emergencyCase);
      }),
      onSocketEvent('hospital-updated', (data) => {
        setHospitals(prev => prev.map(h => h._id === data.hospital._id ? data.hospital : h));
      }),
      onSocketEvent('emergency-status-changed', (data) => {
        setActiveCases(prev => prev.map(c =>
          c._id === data.emergencyId ? { ...c, status: data.status } : c
        ));
      }),
    ];

    return () => {
      unsubs.forEach(unsub => unsub());
      disconnectSocket();
    };
  }, [backendConnected, updateCaseInState]);

  // ── Data Fetching ─────────────────────────────────────────
  const fetchAmbulances = useCallback(async () => {
    try {
      const data = await api.getAllAmbulances();
      setAmbulances(data.ambulances || []);
      return data.ambulances;
    } catch (err) {
      console.error('Failed to fetch ambulances:', err);
      return [];
    }
  }, []);

  const fetchNearbyAmbulances = useCallback(async (location) => {
    try {
      const data = location ? await api.getNearbyAmbulancesByLocation(location) : await api.getNearbyAmbulances();
      return data.ambulances || [];
    } catch (err) {
      console.error('Failed to fetch nearby ambulances:', err);
      return [];
    }
  }, []);

  const fetchHospitals = useCallback(async () => {
    try {
      const data = await api.getAllHospitals();
      setHospitals(data.hospitals || []);
      return data.hospitals;
    } catch (err) {
      console.error('Failed to fetch hospitals:', err);
      return [];
    }
  }, []);

  const fetchNearbyHospitals = useCallback(async (location) => {
    try {
      const data = location ? await api.getNearbyHospitalsByLocation(location) : await api.getNearbyHospitals();
      return data.hospitals || [];
    } catch (err) {
      console.error('Failed to fetch nearby hospitals:', err);
      return [];
    }
  }, []);

  const fetchActiveCases = useCallback(async () => {
    try {
      const data = await api.getActiveCases();
      setActiveCases(data.cases || []);
      return data.cases;
    } catch (err) {
      console.error('Failed to fetch active cases:', err);
      return [];
    }
  }, []);

  // Fetch initial data when connected
  useEffect(() => {
    if (backendConnected) {
      fetchAmbulances();
      fetchHospitals();
      fetchActiveCases();
    }
  }, [backendConnected, fetchActiveCases, fetchAmbulances, fetchHospitals]);

  // ── Emergency Actions ─────────────────────────────────────
  const doTriggerSOS = useCallback(async (location) => {
    setLoading(true);
    setError(null);
    try {
      const userId = user?._id;
      if (!userId) throw new Error('User not logged in');
      const result = await api.triggerSOS(userId, location);
      setCurrentCase(result.emergencyCase);
      setActiveCases(prev => {
        const exists = prev.some(c => c._id === result.emergencyCase._id);
        return exists ? prev : [result.emergencyCase, ...prev];
      });
      fetchAmbulances();
      fetchHospitals();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, fetchAmbulances, fetchHospitals]);

  const doAcceptEmergency = useCallback(async (caseId, ambulanceId) => {
    setLoading(true);
    try {
      const result = await api.acceptEmergency(caseId, ambulanceId);
      updateCaseInState(result.emergencyCase);
      setCurrentCase(result.emergencyCase);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateCaseInState]);

  const doSetHospital = useCallback(async (caseId, hospitalId) => {
    try {
      const result = await api.setHospital(caseId, hospitalId);
      updateCaseInState(result.emergencyCase);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateCaseInState]);

  const doUpdateHospitalResources = useCallback(async (hospitalId, resources) => {
    try {
      const result = await api.updateHospitalResources(hospitalId, resources);
      setHospitals(prev => prev.map(h => h._id === hospitalId ? result.hospital : h));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const doUpdateIncident = useCallback(async (caseId, incidentDetails) => {
    setLoading(true);
    try {
      const result = await api.updateIncident(caseId, incidentDetails);
      updateCaseInState(result.emergencyCase);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateCaseInState]);

  const doUpdateVitals = useCallback(async (caseId, vitals) => {
    try {
      const result = await api.updateVitals(caseId, vitals);
      updateCaseInState(result.emergencyCase);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateCaseInState]);

  const doResolveEmergency = useCallback(async (caseId, resolution) => {
    setLoading(true);
    try {
      const result = await api.resolveEmergency(caseId, resolution);
      setActiveCases(prev => prev.filter(c => c._id !== caseId));
      setCurrentCase(null);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    // Auth
    token, user, isLoggedIn,
    sendOtp, verifyOtp, updateProfile, logout: doLogout,

    // Data
    ambulances, hospitals, activeCases, currentCase,
    fetchAmbulances, fetchNearbyAmbulances,
    fetchHospitals, fetchNearbyHospitals,
    fetchActiveCases,

    // Emergency actions
    triggerSOS: doTriggerSOS,
    acceptEmergency: doAcceptEmergency,
    setHospital: doSetHospital,
    updateHospitalResources: doUpdateHospitalResources,
    updateIncident: doUpdateIncident,
    updateVitals: doUpdateVitals,
    resolveEmergency: doResolveEmergency,
    setCurrentCase,

    // Real-time
    ambulanceLocations, latestVitals,

    // UI state
    loading, error, backendConnected,
    setError, setUser,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
}

export default EmergencyContext;
