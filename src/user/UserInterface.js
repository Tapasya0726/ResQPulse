import React, { useEffect, useState } from "react";
import { useEmergency } from "../context/EmergencyContext";
import LeafletMap from "../components/LeafletMap";

const PHASES = {
  splash: "splash",
  login: "login",
  otp: "otp",
  profile: "profile",
  home: "home",
  processing: "processing",
  tracking: "tracking",
  incident: "incident",
};

const defaultLocation = { lat: 28.6139, lng: 77.209 };

function ResQPulseLogo({ size = 40, showText = true }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: size, height: size, borderRadius: 12, background: "linear-gradient(135deg,#1a3a8f,#dc2626)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size * 0.42 }}>Q</div>
      {showText && (
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: size * 0.48, fontWeight: 900 }}>
            <span style={{ color: "#fff" }}>res</span><span style={{ color: "#3b82f6" }}>Q</span><span style={{ color: "#ea580c" }}>pulse</span>
          </div>
          {size > 30 && <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)", letterSpacing: 1.8, textTransform: "uppercase", marginTop: 4 }}>AI-Driven Emergency Intelligence</div>}
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.62)", zIndex: 100, display: "flex", alignItems: "flex-end", backdropFilter: "blur(3px)" }}>
      <div style={{ width: "100%", maxHeight: "82%", overflowY: "auto", background: "#fff", borderRadius: "24px 24px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 14px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{title}</div>
          <button onClick={onClose} style={iconButton("#f1f5f9", "#0f172a")}>x</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function iconButton(bg, color = "#fff") {
  return { width: 34, height: 34, borderRadius: 10, background: bg, color, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 };
}

function getBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(defaultLocation);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(defaultLocation),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 }
    );
  });
}

function useCurrentLocation() {
  const [location, setLocation] = useState(defaultLocation);

  useEffect(() => {
    getBrowserLocation().then(setLocation);
  }, []);

  return location;
}

function SplashScreen({ onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 1200);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#0f172a,#1e1b4b)" }}>
      <ResQPulseLogo size={72} showText={false} />
      <div style={{ fontSize: 38, fontWeight: 900, marginTop: 22 }}>
        <span style={{ color: "#fff" }}>res</span><span style={{ color: "#3b82f6" }}>Q</span><span style={{ color: "#ea580c" }}>pulse</span>
      </div>
      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginTop: 8 }}>Emergency Intelligence</div>
    </div>
  );
}

function LoginScreen({ onNext }) {
  const { sendOtp, backendConnected } = useEmergency();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const normalized = "+91" + phone.replace(/\D/g, "");
  const ok = phone.replace(/\D/g, "").length >= 10 && backendConnected;

  async function submit() {
    if (!ok || sending) return;
    setSending(true);
    setError("");
    try {
      await sendOtp(normalized);
      onNext(normalized);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff" }}>
      <Header title="One-tap help, when it matters most." subtitle="Sign in to continue" />
      <div style={{ flex: 1, padding: 28 }}>
        {!backendConnected && <StatusBox tone="warn">Backend is not reachable. Start the server and MongoDB before signing in.</StatusBox>}
        <label style={labelStyle}>Mobile Number</label>
        <div style={{ display: "flex", border: "1.5px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          <span style={{ padding: 14, background: "#f8fafc", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>+91</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" style={inputStyle} />
        </div>
        {error && <StatusBox tone="error">{error}</StatusBox>}
      </div>
      <FooterButton disabled={!ok || sending} onClick={submit}>{sending ? "Sending..." : "Send OTP"}</FooterButton>
    </div>
  );
}

function OtpScreen({ phone, onNext }) {
  const { verifyOtp } = useEmergency();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (otp.length !== 4 || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await verifyOtp(phone, otp);
      onNext(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff" }}>
      <Header title="Verify your number" subtitle={`Code sent to ${phone}`} />
      <div style={{ flex: 1, padding: "32px 28px" }}>
        <input value={otp} onChange={(e) => /^\d*$/.test(e.target.value) && setOtp(e.target.value.slice(0, 4))} inputMode="numeric" placeholder="0000" style={{ ...inputStyle, height: 72, textAlign: "center", fontSize: 34, fontWeight: 900, letterSpacing: 14, border: "2px solid #e2e8f0", borderRadius: 16, background: "#f8fafc" }} />
        <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 14 }}>Development OTP is configured on the backend.</div>
        {error && <StatusBox tone="error">{error}</StatusBox>}
      </div>
      <FooterButton disabled={otp.length !== 4 || sending} onClick={submit}>{sending ? "Verifying..." : "Verify OTP"}</FooterButton>
    </div>
  );
}

function ProfileSetupScreen({ onNext }) {
  const { updateProfile } = useEmergency();
  const [form, setForm] = useState({ name: "", age: "", gender: "", bloodGroup: "" });
  const [error, setError] = useState("");
  const valid = form.name.trim().length > 1 && Number(form.age) > 0 && form.gender;

  async function submit() {
    if (!valid) return;
    setError("");
    try {
      await updateProfile({ ...form, age: Number(form.age) });
      onNext();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff" }}>
      <Header title="Your profile" subtitle="Saved to MongoDB for emergency teams" />
      <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
        <Field label="Full Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" style={fieldInputStyle} /></Field>
        <Field label="Age"><input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} type="number" placeholder="28" style={fieldInputStyle} /></Field>
        <Field label="Gender">
          <Segmented options={["Male", "Female", "Other"]} value={form.gender} onChange={(gender) => setForm({ ...form, gender })} />
        </Field>
        <Field label="Blood Group">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bloodGroup) => (
              <Chip key={bloodGroup} selected={form.bloodGroup === bloodGroup} onClick={() => setForm({ ...form, bloodGroup })}>{bloodGroup}</Chip>
            ))}
          </div>
        </Field>
        {error && <StatusBox tone="error">{error}</StatusBox>}
      </div>
      <FooterButton disabled={!valid} onClick={submit}>Enter resQpulse</FooterButton>
    </div>
  );
}

function HomeScreen({ onEmergency }) {
  const ctx = useEmergency();
  const { fetchNearbyAmbulances, fetchNearbyHospitals } = ctx;
  const location = useCurrentLocation();
  const [modal, setModal] = useState(null);

  useEffect(() => {
    fetchNearbyAmbulances(location);
    fetchNearbyHospitals(location);
  }, [location, fetchNearbyAmbulances, fetchNearbyHospitals]);

  const nearestHospital = ctx.hospitals[0];
  const availableAmbulances = ctx.ambulances.filter((a) => a.status === "available");
  const recentCase = ctx.activeCases.find((c) => c.user?._id === ctx.user?._id);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc", position: "relative" }}>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b)", padding: "44px 20px 16px", borderRadius: "0 0 24px 24px", zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <ResQPulseLogo size={28} />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 6 }}>Live emergency network</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setModal("profile")} style={iconButton("rgba(255,255,255,.1)")}>P</button>
          </div>
        </div>
      </div>
      <div style={{ height: 180, overflow: "hidden" }}>
        <LeafletMap userLocation={location} ambulanceLocation={availableAmbulances[0]?.location} hospitalLocation={nearestHospital?.location} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
        <div style={{ display: "flex", gap: 8, padding: "12px 0" }}>
          <MiniStat label="Nearest" value={nearestHospital ? nearestHospital.name.split(",")[0] : "No hospital"} />
          <MiniStat label="Available" value={`${availableAmbulances.length} units`} />
          <MiniStat label="Open Beds" value={`${ctx.hospitals.reduce((sum, h) => sum + (Number(h.bedsAvailable) || 0), 0)}`} />
        </div>
        <div style={{ background: "linear-gradient(160deg,#0f172a,#1a0a0a)", borderRadius: 24, padding: "28px 20px", marginBottom: 12 }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: "rgba(220,38,38,.85)", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>Emergency SOS</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.56)", marginTop: 4 }}>Creates a live MongoDB emergency case</div>
          </div>
          <button onClick={onEmergency} disabled={!ctx.backendConnected || ctx.loading} style={{ width: 148, height: 148, borderRadius: "50%", border: "4px solid rgba(220,38,38,.5)", margin: "0 auto", cursor: ctx.backendConnected ? "pointer" : "not-allowed", background: ctx.backendConnected ? "radial-gradient(circle at 35% 35%,#ef4444,#991b1b)" : "#475569", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(220,38,38,.45)" }}>
            <div style={{ fontSize: 36 }}>SOS</div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, marginTop: 6 }}>{ctx.loading ? "SAVING" : "DISPATCH"}</div>
          </button>
          {!ctx.backendConnected && <div style={{ color: "#fecaca", fontSize: 12, textAlign: "center", marginTop: 18 }}>Backend unavailable</div>}
        </div>
        <Card title="Recent Activity">
          {recentCase ? (
            <CaseSummary c={recentCase} />
          ) : (
            <EmptyState text="No active emergency for this user." />
          )}
        </Card>
      </div>
      {modal === "profile" && <ProfileModal user={ctx.user} onClose={() => setModal(null)} onLogout={() => { ctx.logout(); setModal(null); }} />}
    </div>
  );
}

function ProcessingScreen() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#0f172a,#1a0a0a)", padding: 36 }}>
      <div style={{ width: 90, height: 90, borderRadius: "50%", border: "4px solid #dc2626", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 28 }}>Dispatching help</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,.55)", marginTop: 8, textAlign: "center" }}>Persisting emergency and assigning live resources</div>
    </div>
  );
}

function TrackingScreen({ onCancel, onReport }) {
  const ctx = useEmergency();
  const c = ctx.currentCase;
  const [eta, setEta] = useState(8);

  useEffect(() => {
    const id = setInterval(() => setEta((v) => Math.max(1, v - 1)), 12000);
    return () => clearInterval(id);
  }, []);

  if (!c) {
    return <EmptyFull title="No active emergency" subtitle="Create an SOS case first." onBack={onCancel} />;
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b)", padding: "44px 20px 16px", borderRadius: "0 0 24px 24px", zIndex: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#22c55e", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>Live Tracking</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 4 }}>{c.status.replace("_", " ")}</div>
          </div>
          <div style={{ background: "#dc2626", color: "#fff", borderRadius: 12, padding: "8px 16px", fontSize: 16, fontWeight: 900 }}>{eta} min</div>
        </div>
      </div>
      <div style={{ height: 210, overflow: "hidden" }}>
        <LeafletMap userLocation={c.location} ambulanceLocation={c.ambulance?.location} hospitalLocation={c.hospital?.location} />
      </div>
      <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
        <Card title="Assigned Hospital">
          <StrongLine primary={c.hospital?.name || "Awaiting assignment"} secondary={c.hospital?.address || "Hospital dispatch pending"} />
        </Card>
        <Card title="Ambulance Details">
          <StrongLine primary={c.ambulance?.vehicleNumber || "Awaiting ambulance"} secondary={`${c.ambulance?.driverName || "Driver pending"} ${c.ambulance?.type ? `- ${c.ambulance.type}` : ""}`} />
          {c.ambulance?.contactNumber && <a href={`tel:${c.ambulance.contactNumber}`} style={{ ...primaryButton, marginTop: 12, textDecoration: "none", display: "block", textAlign: "center" }}>Call Ambulance</a>}
        </Card>
        <button onClick={onReport} style={primaryButton}>Add Incident Details</button>
        <button onClick={onCancel} style={{ ...secondaryButton, marginTop: 10 }}>Cancel Emergency</button>
      </div>
    </div>
  );
}

function IncidentReportScreen({ onDone }) {
  const ctx = useEmergency();
  const [form, setForm] = useState({
    emergencyType: [],
    severity: "",
    conscious: null,
    breathing: null,
    bleeding: null,
    patientCount: "1",
    ageGroup: "",
    conditions: [],
    allergies: [],
    medications: "",
    notes: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function toggle(key, value) {
    setForm((prev) => {
      const current = prev[key];
      return { ...prev, [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] };
    });
  }

  async function submit() {
    if (!ctx.currentCase || sending) return;
    setSending(true);
    try {
      await ctx.updateIncident(ctx.currentCase._id, form);
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <EmptyFull title="Incident report sent" subtitle={`${ctx.currentCase?.hospital?.name || "Hospital"} received the pre-arrival details.`} onBack={onDone} />;
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      <Header title="Incident Details" subtitle={`Sending to ${ctx.currentCase?.hospital?.name || "assigned hospital"}`} />
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        <Section title="What happened?">
          <ChipWrap values={["Accident / Trauma", "Cardiac / Chest Pain", "Breathing Difficulty", "Stroke / Paralysis", "Burns", "Poisoning / Overdose", "Pregnancy / Delivery", "Seizure / Epilepsy", "Fracture / Fall", "Other"]} selected={form.emergencyType} onToggle={(v) => toggle("emergencyType", v)} />
        </Section>
        <Section title="Severity"><Segmented options={["Mild", "Moderate", "Critical"]} value={form.severity} onChange={(severity) => setForm({ ...form, severity })} /></Section>
        <Section title="Patient condition">
          <Segmented options={["Conscious", "Unconscious"]} value={form.conscious === true ? "Conscious" : form.conscious === false ? "Unconscious" : ""} onChange={(v) => setForm({ ...form, conscious: v === "Conscious" })} />
          <div style={{ height: 8 }} />
          <Segmented options={["Breathing", "Not breathing"]} value={form.breathing === true ? "Breathing" : form.breathing === false ? "Not breathing" : ""} onChange={(v) => setForm({ ...form, breathing: v === "Breathing" })} />
          <div style={{ height: 8 }} />
          <Segmented options={["Bleeding", "No bleeding"]} value={form.bleeding === true ? "Bleeding" : form.bleeding === false ? "No bleeding" : ""} onChange={(v) => setForm({ ...form, bleeding: v === "Bleeding" })} />
        </Section>
        <Section title="Known conditions"><ChipWrap values={["Diabetes", "Hypertension", "Heart Disease", "Asthma / COPD", "Epilepsy", "Pregnancy", "None known"]} selected={form.conditions} onToggle={(v) => toggle("conditions", v)} /></Section>
        <Section title="Allergies"><ChipWrap values={["Penicillin", "Aspirin", "NSAIDs", "Sulfa Drugs", "Latex", "None known"]} selected={form.allergies} onToggle={(v) => toggle("allergies", v)} /></Section>
        <Section title="Current medications"><input value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} style={fieldInputStyle} placeholder="Medication names" /></Section>
        <Section title="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{ ...fieldInputStyle, resize: "none", lineHeight: 1.5 }} placeholder="Scene details, injury mechanism, symptoms" /></Section>
      </div>
      <FooterButton disabled={sending || !ctx.currentCase} onClick={submit}>{sending ? "Sending..." : "Send Incident Report"}</FooterButton>
    </div>
  );
}

function Header({ title, subtitle }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b)", padding: "40px 28px 28px", borderRadius: "0 0 28px 28px" }}>
      <ResQPulseLogo size={30} />
      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 14, lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", marginTop: 5 }}>{subtitle}</div>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 18 }}><label style={labelStyle}>{label}</label>{children}</div>;
}

function Segmented({ options, value, onChange }) {
  return <div style={{ display: "flex", gap: 8 }}>{options.map((option) => <button key={option} onClick={() => onChange(option)} style={{ flex: 1, padding: "10px 6px", borderRadius: 12, border: `1.5px solid ${value === option ? "#dc2626" : "#e2e8f0"}`, background: value === option ? "#fef2f2" : "#fff", color: value === option ? "#dc2626" : "#64748b", fontWeight: 800, cursor: "pointer" }}>{option}</button>)}</div>;
}

function Chip({ selected, onClick, children }) {
  return <button onClick={onClick} style={{ padding: "8px 12px", borderRadius: 20, border: `1.5px solid ${selected ? "#dc2626" : "#e2e8f0"}`, background: selected ? "#fef2f2" : "#fff", color: selected ? "#dc2626" : "#64748b", fontWeight: 800, cursor: "pointer", fontSize: 12 }}>{children}</button>;
}

function ChipWrap({ values, selected, onToggle }) {
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{values.map((v) => <Chip key={v} selected={selected.includes(v)} onClick={() => onToggle(v)}>{v}</Chip>)}</div>;
}

function Section({ title, children }) {
  return <div style={{ background: "#fff", borderRadius: 16, padding: 15, marginBottom: 11, border: "1px solid #f1f5f9" }}><div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginBottom: 12 }}>{title}</div>{children}</div>;
}

function FooterButton({ children, disabled, onClick }) {
  return <div style={{ padding: "18px 28px 34px" }}><button disabled={disabled} onClick={onClick} style={{ width: "100%", padding: 16, borderRadius: 16, border: "none", background: disabled ? "#e2e8f0" : "linear-gradient(135deg,#1a3a8f,#dc2626)", color: disabled ? "#94a3b8" : "#fff", fontSize: 16, fontWeight: 900, cursor: disabled ? "default" : "pointer" }}>{children}</button></div>;
}

function StatusBox({ tone, children }) {
  const styles = tone === "error" ? { bg: "#fee2e2", color: "#991b1b" } : { bg: "#fef3c7", color: "#92400e" };
  return <div style={{ background: styles.bg, color: styles.color, borderRadius: 10, padding: "9px 12px", marginTop: 12, fontSize: 12, fontWeight: 700 }}>{children}</div>;
}

function MiniStat({ label, value }) {
  return <div style={{ flex: 1, background: "#fff", borderRadius: 14, padding: "10px 7px", textAlign: "center", border: "1px solid #f1f5f9" }}><div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 11, color: "#0f172a", fontWeight: 900, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div></div>;
}

function Card({ title, children }) {
  return <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", border: "1px solid #f1f5f9", marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>{title}</div>{children}</div>;
}

function StrongLine({ primary, secondary }) {
  return <div><div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>{primary}</div><div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{secondary}</div></div>;
}

function CaseSummary({ c }) {
  return <StrongLine primary={`Case #${c._id.slice(-6).toUpperCase()} - ${c.status.replace("_", " ")}`} secondary={`${c.hospital?.name || "Hospital pending"} - ${new Date(c.createdAt).toLocaleString("en-IN")}`} />;
}

function EmptyState({ text }) {
  return <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "14px 0" }}>{text}</div>;
}

function EmptyFull({ title, subtitle, onBack }) {
  return <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, background: "#f8fafc", textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{title}</div><div style={{ fontSize: 13, color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>{subtitle}</div><button onClick={onBack} style={{ ...primaryButton, marginTop: 22, width: "100%" }}>Back</button></div>;
}

function ProfileModal({ user, onClose, onLogout }) {
  return (
    <Modal title="My Profile" onClose={onClose}>
      <StrongLine primary={user?.name || "Profile incomplete"} secondary={user?.phone || ""} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "16px 0" }}>
        <MiniStat label="Age" value={user?.age || "-"} />
        <MiniStat label="Gender" value={user?.gender || "-"} />
        <MiniStat label="Blood" value={user?.bloodGroup || "-"} />
        <MiniStat label="Cases" value="Live" />
      </div>
      <button onClick={onLogout} style={{ ...secondaryButton, width: "100%" }}>Sign Out</button>
    </Modal>
  );
}

const labelStyle = { fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 };
const inputStyle = { flex: 1, border: "none", outline: "none", padding: "14px 16px", fontSize: 16, fontFamily: "inherit", color: "#0f172a", background: "transparent", boxSizing: "border-box", width: "100%" };
const fieldInputStyle = { width: "100%", padding: "13px 16px", borderRadius: 14, fontSize: 15, border: "1.5px solid #e2e8f0", outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#0f172a", background: "#fff" };
const primaryButton = { padding: 14, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#0f172a,#1e1b4b)", color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", width: "100%" };
const secondaryButton = { padding: 13, borderRadius: 14, border: "1.5px solid #fee2e2", background: "#fff", color: "#dc2626", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("UserInterface crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 20, background: "#fee2e2", color: "#991b1b", height: "100vh" }}>{String(this.state.error)}</div>;
    }
    return this.props.children;
  }
}

export default function UserInterface() {
  const ctx = useEmergency();
  const [phase, setPhase] = useState(PHASES.splash);
  const [phone, setPhone] = useState("");
  const [key, setKey] = useState(0);
  const [flowError, setFlowError] = useState("");

  const go = (next) => {
    setKey((value) => value + 1);
    setPhase(next);
  };

  useEffect(() => {
    if (!ctx.isLoggedIn && [PHASES.home, PHASES.processing, PHASES.tracking, PHASES.incident].includes(phase)) go(PHASES.login);
    if (ctx.isLoggedIn && !ctx.user?.isProfileComplete && [PHASES.home, PHASES.processing, PHASES.tracking, PHASES.incident].includes(phase)) go(PHASES.profile);
  }, [ctx.isLoggedIn, ctx.user?.isProfileComplete, phase]);

  async function handleSOS() {
    setFlowError("");
    go(PHASES.processing);
    try {
      const location = await getBrowserLocation();
      await ctx.triggerSOS(location);
      go(PHASES.tracking);
    } catch (err) {
      setFlowError(err.message);
      go(PHASES.home);
    }
  }

  async function handleCancel() {
    if (ctx.currentCase) {
      try {
        await ctx.resolveEmergency(ctx.currentCase._id, "cancelled");
      } catch (err) {
        console.error(err);
      }
    }
    go(PHASES.home);
  }

  const screens = {
    [PHASES.splash]: <SplashScreen onDone={() => go(!ctx.isLoggedIn ? PHASES.login : !ctx.user?.isProfileComplete ? PHASES.profile : PHASES.home)} />,
    [PHASES.login]: <LoginScreen onNext={(value) => { setPhone(value); go(PHASES.otp); }} />,
    [PHASES.otp]: <OtpScreen phone={phone} onNext={(user) => go(user?.isProfileComplete ? PHASES.home : PHASES.profile)} />,
    [PHASES.profile]: <ProfileSetupScreen onNext={() => go(PHASES.home)} />,
    [PHASES.home]: <><HomeScreen onEmergency={handleSOS} />{flowError && <div style={{ position: "absolute", left: 16, right: 16, bottom: 30, zIndex: 250 }}><StatusBox tone="error">{flowError}</StatusBox></div>}</>,
    [PHASES.processing]: <ProcessingScreen />,
    [PHASES.tracking]: <TrackingScreen onCancel={handleCancel} onReport={() => go(PHASES.incident)} />,
    [PHASES.incident]: <IncidentReportScreen onDone={() => go(PHASES.tracking)} />,
  };

  return (
    <ErrorBoundary>
      <style>{`
        .user-interface *{box-sizing:border-box;margin:0;padding:0;}
        .user-interface input:focus,.user-interface textarea:focus{border-color:#ea580c!important;box-shadow:0 0 0 3px rgba(234,88,12,.1);}
        .user-interface ::-webkit-scrollbar{width:0;}
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#cbd5e1", padding: "20px 16px 80px" }}>
        <div className="user-interface" style={{ width: "100%", maxWidth: 390, height: 780, background: "#fff", borderRadius: 44, overflow: "hidden", position: "relative", boxShadow: "0 32px 80px rgba(0,0,0,.25),0 8px 24px rgba(0,0,0,.12)" }}>
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 110, height: 30, background: "#0a0a0a", borderRadius: "0 0 18px 18px", zIndex: 200 }} />
          <div key={key} style={{ position: "absolute", inset: 0, paddingTop: 30 }}>{screens[phase]}</div>
          <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", width: 120, height: 5, background: "#0a0a0a", borderRadius: 3, zIndex: 200 }} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
