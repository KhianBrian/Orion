import { Link } from "react-router-dom";
import "../components/SidebarLayout.css";

const Sessions = () => {
  const sessions = [
    {
      id: 1,
      title: "Career Counseling Session",
      date: "May 1, 2025",
      time: "2:00 PM",
      counselor: "Ms. Marwen Casteñada",
      status: "Completed",
    },
    {
      id: 2,
      title: "Practice Job Interview",
      date: "May 5, 2025",
      time: "10:00 AM",
      interviewer: "Ms. Marwen Casteñada",
      status: "Completed",
    },
  ];

  return (
    <div>
      <div className="sidebar-layout">
        <div className="app-sidebar">
          <Link to="/appointments" className="sidebar-menu-item">
            Appointments
          </Link>
          <Link to="/sessions" className="sidebar-menu-item active">
            Session History
          </Link>
          <Link to="/patient-appointment" className="sidebar-menu-item">
            Book an appointment
          </Link>
          <Link to="/settings" className="sidebar-menu-item">
            Account Settings
          </Link>
        </div>

        <div className="main-content-area">
          <div className="background-blur"></div>

          <div className="content-header">
            <h2 className="content-title">SESSIONS HISTORY</h2>
            <button className="action-button">Book New Appointment</button>
          </div>

          <div className="content-card">
            {sessions.map((session) => (
              <div key={session.id} className="item-card">
                <h3>{session.title}</h3>
                <p>
                  <strong>Date:</strong> {session.date}
                </p>
                <p>
                  <strong>Time:</strong> {session.time}
                </p>
                <p>
                  <strong>
                    {session.counselor ? "Counselor" : "Interviewer"}:
                  </strong>{" "}
                  {session.counselor || session.interviewer}
                </p>
                <p>
                  <strong>Status:</strong> {session.status}
                </p>

                <div className="card-actions">
                  <button className="card-button card-button-secondary">
                    READ FEEDBACK
                  </button>
                  <button className="card-button card-button-primary">
                    DOWNLOAD INVOICE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Sessions;
