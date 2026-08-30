import { useState } from "react";
import { Link } from "react-router-dom";
import "../components/SidebarLayout.css";

const Appointments = () => {
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [showIframe, setShowIframe] = useState(false);
  const [currentMeetUrl, setCurrentMeetUrl] = useState("");

  const appointments = [
    {
      id: 1,
      title: "Career Counseling Session",
      date: "May 1, 2025",
      time: "2:00 PM",
      counselor: "Ms. Marwen Casteñada",
      url: "https://meet.jit.si/OrionCareerCounselingSession",
    },
    {
      id: 2,
      title: "Practice Job Interview",
      date: "May 5, 2025",
      time: "10:00 AM",
      interviewer: "Ms. Marwen Casteñada",
      url: "https://meet.jit.si/OrionPracticeJobInterview",
    },
  ];

  const handleEnterMeeting = (appointment) => {
    setCurrentMeetUrl(appointment.url);
    setActiveMeeting(appointment.id);
    setShowIframe(true);
  };

  const handleCloseMeeting = () => {
    const appointmentTitle = appointments.find(
      (a) => a.id === activeMeeting,
    )?.title;
    setShowIframe(false);
    setActiveMeeting(null);
    setCurrentMeetUrl("");
    if (appointmentTitle) {
      alert(`The meeting for "${appointmentTitle}" has ended.`);
    }
  };

  return (
    <div>
      <div className="sidebar-layout">
        <div className="app-sidebar">
          <Link to="/appointments" className="sidebar-menu-item active">
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
            <h2 className="content-title">My Appointments</h2>
            <div className="header-actions">
              <Link to="/submit-blog" className="secondary-action-button">Share your experience</Link>
              <Link to="/patient-appointment" className="action-button">Book New Appointment</Link>
            </div>
          </div>

          <div className="content-card">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="item-card">
                <h3>{appointment.title}</h3>
                <p>
                  <strong>Date:</strong> {appointment.date}
                </p>
                <p>
                  <strong>Time:</strong> {appointment.time}
                </p>
                <p>
                  <strong>
                    {appointment.counselor ? "Counselor" : "Interviewer"}:
                  </strong>{" "}
                  {appointment.counselor || appointment.interviewer}
                </p>

                <div className="card-actions">
                  <button className="card-button card-button-secondary">
                    RESCHEDULE
                  </button>
                  <button
                    className={`card-button ${activeMeeting === appointment.id ? "card-button-secondary" : "card-button-primary"}`}
                    onClick={() => handleEnterMeeting(appointment)}
                    disabled={
                      activeMeeting !== null && activeMeeting !== appointment.id
                    }
                  >
                    {activeMeeting === appointment.id
                      ? "IN MEETING..."
                      : "ENTER MEETING"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showIframe && (
        <div className="meeting-overlay">
          <div className="meeting-container">
            <div className="meeting-header">
              <h3>Meeting in Progress</h3>
              <button
                className="close-meeting-button"
                onClick={handleCloseMeeting}
              >
                CLOSE MEETING & EXIT
              </button>
            </div>
            <iframe
              src={`${currentMeetUrl}#config.prejoinPageEnabled=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","closedcaptions","desktop","fullscreen","fodeviceselection","hangup","profile","chat","settings","videoquality","filmstrip","feedback","stats","shortcuts","tileview","videobackgroundblur","download","help","mute-everyone","security"]`}
              allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
              className="meeting-iframe"
              title="Jitsi Meet"
            ></iframe>
          </div>
          <style>{`
            .meeting-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0, 0, 0, 0.9);
              z-index: 9999;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .meeting-container {
              width: 90%;
              height: 90%;
              background: #fff;
              border-radius: 12px;
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }
            .meeting-header {
              padding: 15px 20px;
              background: #f8f9fa;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #dee2e6;
            }
            .meeting-header h3 {
              margin: 0;
              color: #333;
            }
            .meeting-iframe {
              flex: 1;
              border: none;
              width: 100%;
              height: 100%;
            }
            .close-meeting-button {
              padding: 10px 20px;
              background: #dc3545;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
              transition: background 0.3s;
            }
            .close-meeting-button:hover {
              background: #c82333;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default Appointments;
