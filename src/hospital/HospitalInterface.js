import React, { useEffect, useMemo, useState } from "react";
import { useEmergency } from "../context/EmergencyContext";
import LeafletMap from "../components/LeafletMap";

const statusMap = {
  pending: "Incoming",
  accepted: "En Route",
  en_route: "En Route",
  resolved: "Arrived",
  cancelled: "Cancelled",
};

function badgeColors(status) {
  const label = statusMap[status] || status || "Incoming";
  if (label === "available") return { bg: "#dcfce7", text: "#166534", dot: "#22c55e" };
  if (label === "en_route" || label === "busy") return { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6" };
  if (label === "maintenance") return { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" };
  if (label === "Arrived") return { bg: "#dcfce7", text: "#166534", dot: "#22c55e" };
  if (label === "En Route") return { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6" };
  if (label === "Cancelled") return { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" };
  return { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" };
}

function toCaseView(c) {
  return {
    id: c._id,
    shortId: c._id.slice(-6).toUpperCase(),
    name: c.user?.name || "Unknown patient",
    age: c.user?.age || "?",
    gender: c.user?.gender || "Unknown",
    blood: c.user?.bloodGroup || "-",
    location: c.location,
    locationLabel: c.location ? `${Number(c.location.lat).toFixed(4)}, ${Number(c.location.lng).toFixed(4)}` : "GPS pending",
    ambulance: c.ambulance,
    hospital: c.hospital,
    status: c.status,
    statusLabel: statusMap[c.status] || c.status,
    critical: c.incidentDetails?.severity === "Critical",
    incidentDetails: c.incidentDetails,
    vitals: c.vitals,
    createdAt: c.createdAt,
  };
}

export default function HospitalInterface() {
  const ctx = useEmergency();
  const { fetchActiveCases, fetchAmbulances, fetchHospitals } = ctx;
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem("resqpulse_hosp_staff") === "true");
  const [activeNav, setActiveNav] = useState("dashboard");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedHospitalId, setSelectedHospitalId] = useState("");

  useEffect(() => {
    fetchActiveCases();
    fetchAmbulances();
    fetchHospitals();
  }, [fetchActiveCases, fetchAmbulances, fetchHospitals]);

  useEffect(() => {
    if (!selectedHospitalId && ctx.hospitals[0]?._id) setSelectedHospitalId(ctx.hospitals[0]._id);
  }, [ctx.hospitals, selectedHospitalId]);

  const cases = useMemo(() => ctx.activeCases.map(toCaseView), [ctx.activeCases]);
  const selectedCase = cases.find((c) => c.id === selectedCaseId) || null;
  const selectedHospital = ctx.hospitals.find((h) => h._id === selectedHospitalId) || ctx.hospitals[0] || null;
  const activeCount = cases.filter((c) => !["resolved", "cancelled"].includes(c.status)).length;
  const deployed = ctx.ambulances.filter((a) => ["en_route", "busy"].includes(a.status)).length;
  const available = ctx.ambulances.filter((a) => a.status === "available").length;

  function handleLogin() {
    localStorage.setItem("resqpulse_hosp_staff", "true");
    setLoggedIn(true);
  }

  async function updateBeds(nextBeds) {
    if (!selectedHospital) return;
    await ctx.updateHospitalResources(selectedHospital._id, { bedsAvailable: nextBeds });
  }

  const pages = {
    dashboard: (
      <DashboardPage
        cases={cases}
        hospitals={ctx.hospitals}
        ambulances={ctx.ambulances}
        activeCount={activeCount}
        deployed={deployed}
        available={available}
        selectedHospital={selectedHospital}
        onUpdateBeds={updateBeds}
        onSelectCase={setSelectedCaseId}
        onOpenCases={() => setActiveNav("cases")}
      />
    ),
    cases: <CasesPage cases={cases} onSelectCase={setSelectedCaseId} />,
    ambulances: <AmbulancesPage ambulances={ctx.ambulances} />,
    hospitals: <HospitalsPage hospitals={ctx.hospitals} selectedHospitalId={selectedHospitalId} setSelectedHospitalId={setSelectedHospitalId} />,
  };

  if (!loggedIn) return <LoginPage connected={ctx.backendConnected} onLogin={handleLogin} hospitals={ctx.hospitals} />;

  return (
    <>
      <style>{`
        .hospital-interface *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',system-ui,sans-serif}
        .hospital-interface button,.hospital-interface input,.hospital-interface select{font-family:inherit}
      `}</style>
      <div className="hospital-interface" style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
        <Sidebar active={activeNav} setActive={setActiveNav} activeCount={activeCount} deployed={deployed} />
        <div style={{ marginLeft: 220, flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <TopBar active={activeNav} activeCount={activeCount} connected={ctx.backendConnected} onLogout={() => { localStorage.removeItem("resqpulse_hosp_staff"); setLoggedIn(false); }} />
          <main style={{ flex: 1, padding: 28 }}>{pages[activeNav]}</main>
        </div>
      </div>
      {selectedCase && <EmergencyModal c={selectedCase} onClose={() => setSelectedCaseId("")} />}
    </>
  );
}

function LoginPage({ connected, onLogin, hospitals }) {
  const [form, setForm] = useState({ email: "", password: "", hospital: "" });
  const ok = connected && form.email.includes("@") && form.password.length >= 4;

  useEffect(() => {
    if (!form.hospital && hospitals[0]?.name) setForm((prev) => ({ ...prev, hospital: hospitals[0].name }));
  }, [hospitals, form.hospital]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "linear-gradient(160deg,#0f172a,#1e1b4b)" }}>
      <div style={{ width: "45%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "#fff", padding: 60 }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg,#1d4ed8,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 900 }}>Q</div>
        <div style={{ fontSize: 42, fontWeight: 900, marginTop: 24 }}>res<span style={{ color: "#dc2626" }}>Q</span>pulse</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", letterSpacing: 3, textTransform: "uppercase", marginTop: 8 }}>Hospital Command Center</div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: 40, width: "100%", maxWidth: 420, boxShadow: "0 40px 80px rgba(0,0,0,.3)" }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", marginBottom: 4 }}>Staff Login</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24 }}>Uses live hospital data from MongoDB.</p>
          {!connected && <Alert tone="error">Backend offline. Start the server before signing in.</Alert>}
          <Field label="Hospital">
            <select value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} style={inputStyle}>
              {hospitals.map((h) => <option key={h._id}>{h.name}</option>)}
            </select>
          </Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@hospital.org" style={inputStyle} /></Field>
          <Field label="Password"><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" style={inputStyle} /></Field>
          <button onClick={onLogin} disabled={!ok} style={{ ...primaryButton, background: ok ? "#dc2626" : "#e2e8f0", color: ok ? "#fff" : "#94a3b8", marginTop: 8 }}>Sign In</button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ active, setActive, activeCount, deployed }) {
  const items = [
    ["dashboard", "Dashboard", ""],
    ["cases", "Incoming Cases", activeCount],
    ["ambulances", "Ambulances", deployed],
    ["hospitals", "Hospitals", ""],
  ];
  return (
    <aside style={{ width: 220, background: "#0f172a", height: "100vh", position: "fixed", left: 0, top: 0, color: "#fff" }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>res<span style={{ color: "#dc2626" }}>Q</span>pulse</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", letterSpacing: 2.5, textTransform: "uppercase", marginTop: 3 }}>Hospital Command</div>
      </div>
      <nav style={{ padding: 12 }}>
        {items.map(([id, label, count]) => (
          <button key={id} onClick={() => setActive(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, border: "none", borderLeft: active === id ? "2px solid #dc2626" : "2px solid transparent", borderRadius: 10, padding: "11px 12px", cursor: "pointer", textAlign: "left", background: active === id ? "rgba(220,38,38,.15)" : "transparent", color: active === id ? "#fff" : "rgba(255,255,255,.55)", fontWeight: 800 }}>
            <span style={{ flex: 1 }}>{label}</span>
            {count !== "" && <span style={{ background: "#dc2626", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10 }}>{count}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function TopBar({ active, activeCount, connected, onLogout }) {
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #f1f5f9", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", textTransform: "capitalize" }}>{active}</div>
        <div style={{ fontSize: 11, color: connected ? "#22c55e" : "#dc2626", fontWeight: 800 }}>{connected ? "MongoDB live" : "Backend offline"}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {activeCount > 0 && <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 900 }}>{activeCount} active</span>}
        <button onClick={onLogout} style={{ border: "none", background: "#f1f5f9", color: "#0f172a", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800 }}>Sign out</button>
      </div>
    </div>
  );
}

function DashboardPage({ cases, hospitals, ambulances, activeCount, deployed, available, selectedHospital, onUpdateBeds, onSelectCase, onOpenCases }) {
  const [beds, setBeds] = useState(selectedHospital?.bedsAvailable || 0);

  useEffect(() => setBeds(selectedHospital?.bedsAvailable || 0), [selectedHospital?._id, selectedHospital?.bedsAvailable]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 16 }}>
        <StatCard label="Active Emergencies" value={activeCount} accent="#dc2626" />
        <StatCard label="Ambulances Deployed" value={deployed} sub={`of ${ambulances.length}`} accent="#3b82f6" />
        <StatCard label="Available Units" value={available} accent="#22c55e" />
        <StatCard label="Hospitals Online" value={hospitals.length} accent="#8b5cf6" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <Panel title="Live Emergency Feed" action={cases.length ? "View all" : ""} onAction={onOpenCases}>
          {cases.length === 0 ? <Empty text="No active emergency cases." /> : cases.slice(0, 5).map((c) => <CaseCard key={c.id} c={c} onClick={() => onSelectCase(c.id)} />)}
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Bed Availability">
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>{selectedHospital?.name || "No hospital selected"}</div>
            <input type="number" value={beds} onChange={(e) => setBeds(e.target.value)} style={inputStyle} />
            <button onClick={() => onUpdateBeds(Number(beds) || 0)} style={{ ...primaryButton, marginTop: 10 }}>Save Beds</button>
          </Panel>
          <Panel title="Fleet Status">
            {ambulances.slice(0, 5).map((a) => <AmbulanceRow key={a._id} a={a} />)}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function CasesPage({ cases, onSelectCase }) {
  const [filter, setFilter] = useState("All");
  const statuses = ["All", "Incoming", "En Route", "Arrived", "Cancelled"];
  const filtered = filter === "All" ? cases : cases.filter((c) => c.statusLabel === filter);

  return (
    <div>
      <Toolbar title="Incoming Cases" subtitle="Active and recent MongoDB emergency cases" filters={statuses} filter={filter} setFilter={setFilter} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {filtered.map((c) => <CaseCard key={c.id} c={c} onClick={() => onSelectCase(c.id)} />)}
      </div>
      {filtered.length === 0 && <Empty text={`No cases with status ${filter}.`} />}
    </div>
  );
}

function AmbulancesPage({ ambulances }) {
  return (
    <div>
      <Toolbar title="Ambulance Fleet" subtitle="Live fleet records from MongoDB" />
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f8fafc" }}>{["Unit No.", "Driver", "Contact", "Type", "Status"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>{ambulances.map((a) => <tr key={a._id} style={{ borderTop: "1px solid #f8fafc" }}><td style={tdStyle}>{a.vehicleNumber}</td><td style={tdStyle}>{a.driverName}</td><td style={tdStyle}>{a.contactNumber}</td><td style={tdStyle}>{a.type}</td><td style={tdStyle}><Badge status={a.status} raw /></td></tr>)}</tbody>
        </table>
        {ambulances.length === 0 && <Empty text="No ambulances found. Run the seed command." />}
      </div>
    </div>
  );
}

function HospitalsPage({ hospitals, selectedHospitalId, setSelectedHospitalId }) {
  return (
    <div>
      <Toolbar title="Hospitals" subtitle="Live facilities and resource availability" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
        {hospitals.map((h) => (
          <button key={h._id} onClick={() => setSelectedHospitalId(h._id)} style={{ textAlign: "left", background: "#fff", borderRadius: 16, padding: 18, border: `1.5px solid ${selectedHospitalId === h._id ? "#3b82f6" : "#f1f5f9"}`, cursor: "pointer" }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{h.name}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{h.address}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}><SmallPill>{h.bedsAvailable || 0} beds</SmallPill><SmallPill>{h.icuBedsAvailable || 0} ICU</SmallPill><SmallPill>{h.erStatus || "open"}</SmallPill></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmergencyModal({ c, onClose }) {
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(10,15,28,.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "min(900px,95vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,.3)" }}>
        <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b)", borderRadius: "20px 20px 0 0", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Emergency Case #{c.shortId}</div><div style={{ color: "#fff", fontSize: 24, fontWeight: 900, marginTop: 4 }}>{c.name}</div></div>
          <button onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,.1)", color: "#fff", borderRadius: "50%", width: 36, height: 36, cursor: "pointer" }}>x</button>
        </div>
        <div style={{ padding: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <Panel title="Patient Information">
            <DetailGrid rows={[["Name", c.name], ["Age", `${c.age} yrs`], ["Gender", c.gender], ["Blood", c.blood], ["Location", c.locationLabel], ["Reported", new Date(c.createdAt).toLocaleString("en-IN")]]} />
          </Panel>
          <Panel title="Live Route">
            <div style={{ height: 300, borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0" }}><LeafletMap userLocation={c.location} ambulanceLocation={c.ambulance?.location} hospitalLocation={c.hospital?.location} /></div>
          </Panel>
          <Panel title="Incident Report">
            {c.incidentDetails ? <DetailGrid rows={[["Severity", c.incidentDetails.severity || "-"], ["Type", c.incidentDetails.emergencyType?.join(", ") || "-"], ["Conscious", yesNo(c.incidentDetails.conscious)], ["Breathing", yesNo(c.incidentDetails.breathing)], ["Bleeding", yesNo(c.incidentDetails.bleeding)], ["Notes", c.incidentDetails.notes || "-"]]} /> : <Empty text="No incident details submitted yet." />}
          </Panel>
          <Panel title="Live Vitals">
            {c.vitals ? <DetailGrid rows={[["HR", `${c.vitals.heartRate || "-"} bpm`], ["SpO2", `${c.vitals.spO2 || "-"}%`], ["BP", c.vitals.bp || "-"], ["Temperature", c.vitals.temperature ? `${c.vitals.temperature} C` : "-"], ["Updated", c.vitals.timestamp ? new Date(c.vitals.timestamp).toLocaleString("en-IN") : "-"]]} /> : <Empty text="Waiting for ambulance vitals." />}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #f1f5f9", flex: 1 }}><div style={{ fontSize: 28, fontWeight: 900, color: accent }}>{value}</div><div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4 }}>{label}</div>{sub && <div style={{ fontSize: 10, color: accent, marginTop: 6, fontWeight: 800 }}>{sub}</div>}</div>;
}

function Panel({ title, action, onAction, children }) {
  return <div style={{ background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #f1f5f9" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><h2 style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{title}</h2>{action && <button onClick={onAction} style={{ border: "none", background: "transparent", color: "#3b82f6", fontWeight: 800, cursor: "pointer" }}>{action}</button>}</div>{children}</div>;
}

function CaseCard({ c, onClick }) {
  return <button onClick={onClick} style={{ width: "100%", textAlign: "left", background: "#fff", borderRadius: 16, padding: "16px 18px", border: `1.5px solid ${c.critical ? "#fca5a5" : "#f1f5f9"}`, cursor: "pointer", marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{c.name}</div><div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{c.age}y - {c.gender} - {c.blood}</div></div><Badge status={c.status} /></div><div style={{ fontSize: 12, color: "#64748b", marginTop: 10 }}>Case #{c.shortId} - {c.ambulance?.vehicleNumber || "Ambulance pending"}</div></button>;
}

function AmbulanceRow({ a }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>{a.vehicleNumber}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{a.driverName}</div></div><Badge status={a.status} raw /></div>;
}

function Badge({ status, raw = false }) {
  const c = badgeColors(raw ? statusMap[status] || status : status);
  const label = raw ? String(status || "").replace("_", " ") : statusMap[status] || status;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, color: c.text, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 900, textTransform: "capitalize" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{label}</span>;
}

function Toolbar({ title, subtitle, filters, filter, setFilter }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}><div><h1 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{title}</h1><p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{subtitle}</p></div>{filters && <div style={{ display: "flex", gap: 8 }}>{filters.map((f) => <button key={f} onClick={() => setFilter(f)} style={{ border: "none", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontWeight: 800, background: filter === f ? "#0f172a" : "#f1f5f9", color: filter === f ? "#fff" : "#64748b" }}>{f}</button>)}</div>}</div>;
}

function DetailGrid({ rows }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{rows.map(([label, value]) => <div key={label} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px", border: "1px solid #f1f5f9" }}><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 900, textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 13, color: "#0f172a", fontWeight: 800, marginTop: 4 }}>{value}</div></div>)}</div>;
}

function Field({ label, children }) {
  return <label style={{ display: "block", marginBottom: 16 }}><div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>{label}</div>{children}</label>;
}

function Alert({ tone, children }) {
  return <div style={{ background: tone === "error" ? "#fee2e2" : "#fef3c7", color: tone === "error" ? "#991b1b" : "#92400e", borderRadius: 10, padding: "9px 12px", marginBottom: 14, fontSize: 12, fontWeight: 800 }}>{children}</div>;
}

function Empty({ text }) {
  return <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>{text}</div>;
}

function SmallPill({ children }) {
  return <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 900, textTransform: "capitalize" }}>{children}</span>;
}

function yesNo(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "-";
}

const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", background: "#fff" };
const primaryButton = { width: "100%", border: "none", borderRadius: 12, padding: "13px 14px", color: "#fff", background: "#dc2626", cursor: "pointer", fontWeight: 900 };
const thStyle = { padding: "12px 18px", textAlign: "left", fontSize: 11, fontWeight: 900, color: "#64748b", letterSpacing: .8, textTransform: "uppercase" };
const tdStyle = { padding: "14px 18px", fontSize: 13, color: "#0f172a", fontWeight: 700 };
