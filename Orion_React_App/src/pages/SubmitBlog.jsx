import { Link } from "react-router-dom";
import { useState } from "react";
import "../components/SidebarLayout.css";
import "./SubmitBlog.css";

const SubmitBlog = () => {
  const [formData, setFormData] = useState({ name: "", title: "", content: "", consent: false });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const submissions = JSON.parse(localStorage.getItem("orionFeedback") || "[]");
    localStorage.setItem("orionFeedback", JSON.stringify([...submissions, { ...formData, createdAt: new Date().toISOString() }]));
    setSubmitted(true);
    setFormData({ name: "", title: "", content: "", consent: false });
  };

  return (
    <div>
      <div className="sidebar-layout">
        <div className="app-sidebar">
          <Link to="/appointments" className="sidebar-menu-item">
            Appointments
          </Link>
          <Link to="/sessions" className="sidebar-menu-item">
            Session History
          </Link>
          <Link to="/doctor-availability" className="sidebar-menu-item">
            Doctor Availability
          </Link>
          <Link to="/patient-appointment" className="sidebar-menu-item">
            Patient Appointment
          </Link>
          <Link to="/settings" className="sidebar-menu-item">
            Account Settings
          </Link>
        </div>

        <div className="main-content-area">
          <div className="background-blur"></div>

          <div className="content-header">
            <h2 className="content-title">Share your experience</h2>
          </div>

          <div className="content-card">
            <form onSubmit={handleSubmit}>
              <p className="feedback-intro">Tell us how Orion supported you. Your submission will be reviewed before it is shared publicly.</p>
              <input className="feedback-input" placeholder="Your name or initials" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              <input className="feedback-input" placeholder="A short title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              <textarea className="blog-textarea" placeholder="Share your experience" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows="10" required />
              <label className="feedback-consent"><input type="checkbox" checked={formData.consent} onChange={(e) => setFormData({ ...formData, consent: e.target.checked })} required /> I understand this may be published after review.</label>

              <div className="blog-actions">
                <button type="submit" className="action-button">
                  Submit for review
                </button>
              </div>
              {submitted && <p className="feedback-success" role="status">Thank you. Your experience was submitted for review.</p>}
            </form>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SubmitBlog;
