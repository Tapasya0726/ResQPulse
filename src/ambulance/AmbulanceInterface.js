import { useEffect, useMemo, useState } from "react";
import { useEmergency } from "../context/EmergencyContext";
import LeafletMap from "../components/LeafletMap";

function statusLabel(status) {
  return String(status || "pending").replace("_", " ");
}

function caseTitle(c) {
  const type = c.incidentDetails?.emergencyType?.[0] || "Emergency";
  return `${type} - ${c.user?.name || "Unknown patient"}`;
}

function severityColor(severity) {
  if (severity === "Critical") return "#ef4444";
  if (severity === "Mild") return "#22c55e";
  return "#f59e0b";
}

export default function AmbulanceInterface() {
  const ctx = useEmergency();
  const { fetchActiveCases, fetchAmbulances, fetchHospitals } = ctx;
  const [activeTab, setActiveTab] = useState("requests");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [vitals, setVitals] = useState({ heartRate: "", spO2: "", bp: "", temperature: "" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchActiveCases();
    fetchAmbulances();
    fetchHospitals();
  }, [fetchActiveCases, fetchAmbulances, fetchHospitals]);

  const activeCases = useMemo(
    () => ctx.activeCases.filter((c) => !["resolved", "cancelled"].includes(c.status)),
    [ctx.activeCases]
  );
  const selectedCase = activeCases.find((c) => c._id === selectedCaseId) || activeCases[0] || null;
  const selectedHospital = ctx.hospitals.find((h) => h._id === selectedHospitalId) || selectedCase?.hospital || ctx.hospitals[0] || null;
  const availableAmbulance = ctx.ambulances.find((a) => a.status === "available") || selectedCase?.ambulance || ctx.ambulances[0] || null;

  useEffect(() => {
    if (selectedCase && !selectedCaseId) setSelectedCaseId(selectedCase._id);
  }, [selectedCase, selectedCaseId]);

  async function acceptCase(c) {
    setNotice("");
    try {
      const res = await ctx.acceptEmergency(c._id, c.ambulance?._id || availableAmbulance?._id);
      setSelectedCaseId(res.emergencyCase._id);
      setActiveTab("navigation");
      setNotice("Emergency accepted and persisted.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function assignHospital(hospitalId) {
    if (!selectedCase || !hospitalId) return;
    setNotice("");
    try {
      await ctx.setHospital(selectedCase._id, hospitalId);
      setSelectedHospitalId(hospitalId);
      setNotice("Destination hospital updated.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function sendVitals() {
    if (!selectedCase) return;
    const bpValid = /^\d+\/\d+$/.test(vitals.bp.trim());
    if (!vitals.heartRate || !vitals.spO2 || !bpValid) {
      setNotice("Heart rate, SpO2, and blood pressure in number/number format are required.");
      return;
    }
    setNotice("");
    try {
      await ctx.updateVitals(selectedCase._id, {
        heartRate: Number(vitals.heartRate),
        spO2: Number(vitals.spO2),
        bp: vitals.bp,
        temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
      });
      setNotice("Vitals transmitted to hospital.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <div className="ambulance-interface" style={{ minHeight: "100vh", background: "#0a0f1e", color: "#f0f4ff", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        .ambulance-interface *{box-sizing:border-box}
        .ambulance-interface button,.ambulance-interface input{font-family:inherit}
        .ambulance-interface input{background:#1f2d42;border:1px solid rgba(255,255,255,.14);border-radius:8px;color:#f0f4ff;padding:10px 12px;outline:none;width:100%}
      `}</style>
      <TopBar connected={ctx.backendConnected} />
      <nav style={{ display: "flex", background: "#111827", borderBottom: "1px solid rgba(255,255,255,.08)", overflowX: "auto" }}>
        {[
          ["requests", "Requests"],
          ["navigation", "Navigate"],
          ["hospitals", "Hospitals"],
          ["transmit", "Transmit"],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={tabStyle(activeTab === id)}>{label}</button>
        ))}
      </nav>
      {notice && <div style={{ margin: 12, borderRadius: 10, padding: "10px 14px", background: notice.includes("required") || notice.includes("failed") ? "rgba(239,68,68,.16)" : "rgba(34,197,94,.14)", color: notice.includes("required") || notice.includes("failed") ? "#f87171" : "#4ade80", fontSize: 12, fontWeight: 700 }}>{notice}</div>}
      <main style={{ padding: 12 }}>
        {activeTab === "requests" && (
          <Section title="Incoming Requests" meta={`${activeCases.length} active`}>
            {activeCases.length === 0 && <Empty text="No active emergency cases from MongoDB." />}
            {activeCases.map((c) => (
              <RequestCard key={c._id} c={c} onAccept={() => acceptCase(c)} onSelect={() => { setSelectedCaseId(c._id); setActiveTab("navigation"); }} />
            ))}
          </Section>
        )}

        {activeTab === "navigation" && (
          <Section title="Smart Route Navigation">
            {!selectedCase ? <Empty text="Select an active request to navigate." /> : (
              <>
                <InfoCard title={caseTitle(selectedCase)} subtitle={`Case #${selectedCase._id.slice(-6).toUpperCase()} - ${statusLabel(selectedCase.status)}`} color={severityColor(selectedCase.incidentDetails?.severity)} />
                <div style={{ height: 260, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", marginBottom: 12 }}>
                  <LeafletMap userLocation={selectedCase.location} ambulanceLocation={selectedCase.ambulance?.location || availableAmbulance?.location} hospitalLocation={selectedHospital?.location} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  <Metric label="Ambulance" value={selectedCase.ambulance?.vehicleNumber || availableAmbulance?.vehicleNumber || "Pending"} />
                  <Metric label="Hospital" value={selectedHospital?.name?.split(",")[0] || "Pending"} />
                  <Metric label="Status" value={statusLabel(selectedCase.status)} />
                </div>
              </>
            )}
          </Section>
        )}

        {activeTab === "hospitals" && (
          <Section title="Nearest Hospitals" meta={`${ctx.hospitals.length} facilities`}>
            {ctx.hospitals.length === 0 && <Empty text="No hospitals found in MongoDB. Run the seed command." />}
            {ctx.hospitals.map((h) => (
              <button key={h._id} onClick={() => assignHospital(h._id)} style={hospitalStyle((selectedHospital?._id || selectedHospitalId) === h._id)}>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: "#8899bb", marginTop: 3 }}>{h.address}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <Pill>{h.bedsAvailable || 0} beds</Pill>
                    <Pill>{h.icuBedsAvailable || 0} ICU</Pill>
                    <Pill>{h.erStatus || "open"}</Pill>
                  </div>
                </div>
                <span style={{ color: "#60a5fa", fontWeight: 900 }}>{(selectedHospital?._id || selectedHospitalId) === h._id ? "Selected" : "Assign"}</span>
              </button>
            ))}
          </Section>
        )}

        {activeTab === "transmit" && (
          <Section title="Transmit Patient Data">
            {!selectedCase ? <Empty text="Accept or select a case before transmitting vitals." /> : (
              <>
                <InfoCard title={`Patient #${selectedCase._id.slice(-6).toUpperCase()}`} subtitle={`${selectedCase.user?.gender || "Unknown"} - ${selectedCase.user?.age || "?"} yrs - ${selectedHospital?.name || "hospital pending"}`} color="#e63946" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <Field label="Heart Rate"><input type="number" value={vitals.heartRate} onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })} placeholder="bpm" /></Field>
                  <Field label="SpO2"><input type="number" value={vitals.spO2} onChange={(e) => setVitals({ ...vitals, spO2: e.target.value })} placeholder="%" /></Field>
                  <Field label="Blood Pressure"><input value={vitals.bp} onChange={(e) => setVitals({ ...vitals, bp: e.target.value })} placeholder="120/80" /></Field>
                  <Field label="Temperature"><input type="number" value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })} placeholder="C" /></Field>
                </div>
                <button onClick={sendVitals} style={primaryButton}>Send Data</button>
              </>
            )}
          </Section>
        )}
      </main>
    </div>
  );
}

function TopBar({ connected }) {
  return (
    <div style={{ background: "#111827", borderBottom: "1px solid rgba(255,255,255,.14)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>res<span style={{ color: "#e63946" }}>Q</span>pulse</div>
        <div style={{ fontSize: 10, color: "#8899bb", letterSpacing: 1.5, textTransform: "uppercase" }}>Ambulance Console</div>
      </div>
      <div style={{ fontSize: 12, color: connected ? "#4ade80" : "#f87171", fontWeight: 800 }}>{connected ? "MongoDB live" : "Backend offline"}</div>
    </div>
  );
}

function Section({ title, meta, children }) {
  return <section><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><h2 style={{ fontSize: 12, color: "#8899bb", letterSpacing: 1.2, textTransform: "uppercase" }}>{title}</h2>{meta && <span style={{ fontSize: 11, color: "#e63946", fontWeight: 800 }}>{meta}</span>}</div>{children}</section>;
}

function RequestCard({ c, onAccept, onSelect }) {
  const severity = c.incidentDetails?.severity || "Moderate";
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,.08)", borderLeft: `4px solid ${severityColor(severity)}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{caseTitle(c)}</div>
          <div style={{ fontSize: 11, color: "#8899bb", marginTop: 3 }}>Case #{c._id.slice(-6).toUpperCase()} - {statusLabel(c.status)}</div>
        </div>
        <Pill color={severityColor(severity)}>{severity}</Pill>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onAccept} disabled={c.status !== "pending"} style={{ ...primaryButton, opacity: c.status !== "pending" ? .55 : 1 }}>{c.status === "pending" ? "Accept" : "Accepted"}</button>
        <button onClick={onSelect} style={secondaryButton}>View Route</button>
      </div>
    </div>
  );
}

function InfoCard({ title, subtitle, color }) {
  return <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,.08)", borderLeft: `4px solid ${color}`, borderRadius: 14, padding: 14, marginBottom: 12 }}><div style={{ fontSize: 15, fontWeight: 900 }}>{title}</div><div style={{ fontSize: 11, color: "#8899bb", marginTop: 4 }}>{subtitle}</div></div>;
}

function Metric({ label, value }) {
  return <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 12, minHeight: 74 }}><div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", fontWeight: 800 }}>{label}</div><div style={{ fontSize: 14, fontWeight: 900, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>;
}

function Field({ label, children }) {
  return <label style={{ display: "block" }}><div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", fontWeight: 800, marginBottom: 6 }}>{label}</div>{children}</label>;
}

function Pill({ children, color = "#60a5fa" }) {
  return <span style={{ display: "inline-flex", color, background: `${color}20`, borderRadius: 999, padding: "3px 8px", fontSize: 10, fontWeight: 800, textTransform: "capitalize" }}>{children}</span>;
}

function Empty({ text }) {
  return <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 24, color: "#8899bb", textAlign: "center", fontSize: 13 }}>{text}</div>;
}

function tabStyle(active) {
  return { flex: 1, minWidth: 90, padding: "12px 8px", background: "transparent", color: active ? "#e63946" : "#8899bb", border: "none", borderBottom: active ? "2px solid #e63946" : "2px solid transparent", cursor: "pointer", fontWeight: 800 };
}

function hospitalStyle(active) {
  return { width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 10, background: active ? "#1e3a5f" : "#111827", color: "#f0f4ff", border: `1px solid ${active ? "#3b82f6" : "rgba(255,255,255,.08)"}`, borderRadius: 14, cursor: "pointer" };
}

const primaryButton = { flex: 1, border: "none", borderRadius: 10, background: "#22c55e", color: "#fff", padding: "10px 12px", cursor: "pointer", fontWeight: 900 };
const secondaryButton = { flex: 1, border: "1px solid rgba(255,255,255,.14)", borderRadius: 10, background: "#1a2236", color: "#f0f4ff", padding: "10px 12px", cursor: "pointer", fontWeight: 900 };
