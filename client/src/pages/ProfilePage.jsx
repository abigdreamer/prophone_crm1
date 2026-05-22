import React from "react";
import { useTheme } from "../context/ThemeContext";
import { User, Mail, Phone, Building2, ShieldCheck, Hash, Calendar } from "lucide-react";

/**
 * ProfilePage - Prophone CRM Edition
 * Layout: Based on image_1cc4fa_2.png
 * Data: Dynamic currentUser props
 */
export default function ProfilePage({ currentUser }) {
  const T = useTheme();

  if (!currentUser) return null;

  // Use dynamic data from currentUser while providing safe fallbacks
  const userData = {
    username: currentUser.name?.toLowerCase().replace(/\s/g, "") || "user",
    displayName: currentUser.name || "User Name",
    email: currentUser.email || "—",
    mobile: currentUser.phone || "+251 900 000 000", // Dynamic fallback
    company: "GeniusAI Prophone", 
    role: currentUser.role || "Staff",
    color: currentUser.color || T.accent,
    id: currentUser.id || "N/A",
    initials: currentUser.avatar || currentUser.name?.[0]?.toUpperCase() || "?"
  };

  const containerStyle = {
    width: "100%",
    maxWidth: 720,
    margin: "40px auto",
    background: T.card, // Responsive to your Prophone theme
    border: `1px solid ${T.border}`,
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: T.shadowLg || "0 10px 30px rgba(0,0,0,0.1)",
    fontFamily: "'Inter', sans-serif",
  };

  // Header gradient derived from the theme or the image style
  const headerGradient = `linear-gradient(90deg, ${T.blue || "#1e3a8a"} 0%, ${T.accent || "#2563eb"} 100%)`;

  return (
    <div style={containerStyle}>
      {/* Header Banner - Styles matched from image_1cc4fa_2.png */}
      <div style={{ height: 140, background: headerGradient, position: "relative" }}>
        
        {/* Overlapping Avatar */}
        <div style={{
          position: "absolute",
          left: 32,
          bottom: -36,
          width: 80,
          height: 80,
          background: userData.color,
          borderRadius: 20,
          border: `5px solid ${T.card}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
          fontWeight: 900,
          color: "#fff",
          boxShadow: "0 8px 20px rgba(0,0,0,0.15)"
        }}>
          {userData.initials}
        </div>

        {/* Floating Header Info */}
        <div style={{ position: "absolute", left: 132, bottom: 18, color: "#fff" }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>
            {userData.username}
          </h2>
          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
            <span style={{ 
              background: "rgba(255,255,255,0.2)", 
              backdropFilter: "blur(4px)",
              color: "#fff", 
              fontSize: 11, 
              fontWeight: 700, 
              padding: "4px 12px", 
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              gap: 5,
              textTransform: "uppercase"
            }}>
              <ShieldCheck size={13} /> {userData.role}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.9, display: "flex", alignItems: "center", gap: 6 }}>
              <Building2 size={14} /> {userData.company}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Details Section */}
      <div style={{ padding: "64px 32px 32px" }}>
        <ProfileField 
          icon={<User size={18} />} 
          label="USERNAME" 
          value={userData.username} 
          T={T}
        />
        <ProfileField 
          icon={<Mail size={18} />} 
          label="EMAIL ADDRESS" 
          value={userData.email} 
          T={T}
        />
        <ProfileField 
          icon={<Phone size={18} />} 
          label="MOBILE" 
          value={userData.mobile} 
          T={T}
        />
        <ProfileField 
          icon={<Hash size={18} />} 
          label="ACCOUNT ID" 
          value={userData.id} 
          T={T}
          isLast
        />
      </div>
    </div>
  );
}

/**
 * Sub-component for individual rows
 */
function ProfileField({ icon, label, value, T, isLast }) {
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: 20, 
      padding: "20px 0",
      borderBottom: isLast ? "none" : `1px solid ${T.border}`
    }}>
      <div style={{ 
        width: 44, 
        height: 44, 
        background: T.surface || "#f8fafc", 
        border: `1px solid ${T.border}`,
        borderRadius: 12, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        color: T.muted || "#64748b" 
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: 10, 
          fontWeight: 800, 
          color: T.muted || "#94a3b8", 
          letterSpacing: "1px",
          marginBottom: 4 
        }}>
          {label}
        </div>
        <div style={{ 
          fontSize: 15, 
          fontWeight: 700, 
          color: T.text || "#1e293b" 
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}