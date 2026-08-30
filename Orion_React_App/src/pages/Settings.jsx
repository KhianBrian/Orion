import { Link } from "react-router-dom";
import { useState } from "react";
import "../components/SidebarLayout.css";
import "./Settings.css";

const Settings = () => {
  const [profile, setProfile] = useState({ name: "Orion Developer", email: "dev@orion.app", phone: "09171234567" });
  const [privacy, setPrivacy] = useState({ showName: true, showPhoto: false, sharePhone: false, publishFeedback: false });
  const [saved, setSaved] = useState(false);
  const updateProfile = (event) => setProfile({ ...profile, [event.target.name]: event.target.value });
  const updatePrivacy = (key) => setPrivacy({ ...privacy, [key]: !privacy[key] });
  const saveSettings = (event) => { event.preventDefault(); localStorage.setItem("orionProfile", JSON.stringify({ profile, privacy })); setSaved(true); };
  return <div className="sidebar-layout"><div className="app-sidebar"><Link to="/appointments" className="sidebar-menu-item">Appointments</Link><Link to="/sessions" className="sidebar-menu-item">Session History</Link><Link to="/patient-appointment" className="sidebar-menu-item">Book a Session</Link><Link to="/settings" className="sidebar-menu-item active">Account Settings</Link></div><div className="main-content-area"><div className="background-blur" /><div className="content-header"><h2 className="content-title">Account Settings</h2></div><form className="settings-form" onSubmit={saveSettings}><section className="content-card settings-section"><h3>Account information</h3><p className="settings-help">Only information needed to manage your account is collected here.</p><label>Full name<input name="name" value={profile.name} onChange={updateProfile} required /></label><label>Email address<input type="email" name="email" value={profile.email} onChange={updateProfile} required /></label><label>Phone number<input type="tel" name="phone" value={profile.phone} onChange={updateProfile} /></label></section><section className="content-card settings-section"><h3>What you share</h3><p className="settings-help">Your private information is not shown to other users by default.</p>{[['showName', 'Show my name to counselors'], ['showPhoto', 'Show my profile photo'], ['sharePhone', 'Share my phone number for appointment coordination'], ['publishFeedback', 'Allow my feedback to be published after review']].map(([key, label]) => <label className="privacy-row" key={key}><span>{label}</span><input type="checkbox" checked={privacy[key]} onChange={() => updatePrivacy(key)} /></label>)}</section><div className="settings-actions"><button className="action-button" type="submit">Save settings</button>{saved && <span className="feedback-success" role="status">Settings saved.</span>}</div></form></div></div>;
};
export default Settings;
