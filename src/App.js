import { useState } from "react";
import { EmergencyProvider } from "./context/EmergencyContext";

import UserInterface from "./user/UserInterface";
import AmbulanceInterface from "./ambulance/AmbulanceInterface";
import HospitalInterface from "./hospital/HospitalInterface";

export default function App() {
  const [activeTab, setActiveTab] = useState("user");

  return (
    <EmergencyProvider>
      <div>
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 10,
          padding: 15,
          background: "#0f172a"
        }}>
          {["user", "ambulance", "hospital"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
                background: activeTab === tab ? "#dc2626" : "#1e293b",
                color: "#fff"
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {activeTab === "user" && <UserInterface />}
        {activeTab === "ambulance" && <AmbulanceInterface />}
        {activeTab === "hospital" && <HospitalInterface />}
      </div>
    </EmergencyProvider>
  );
}