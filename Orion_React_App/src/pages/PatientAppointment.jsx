import { useState } from "react";
import { Link } from "react-router-dom";
import "../components/SidebarLayout.css";
import "./PatientAppointment.css";

const PatientAppointment = () => {
  const [selectedSpecialization, setSelectedSpecialization] = useState("all");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedPatientCounselor, setSelectedPatientCounselor] =
    useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Mock data for patient counselors (replica format)
  const patientCounselors = [
    {
      id: 1,
      name: "Counselor Sarah Johnson",
      specialization: "General Well-being",
      credential: "Licensed Guidance Counselor",
      experience: "15 years in practice",
      languages: ["English", "Spanish"],
      consultationFee: "₱8,500",
      initials: "SJ",
      availableSlots: ["09:00 AM", "10:30 AM", "02:00 PM", "04:00 PM"],
    },
    {
      id: 2,
      name: "Counselor Michael Chen",
      specialization: "Mental Health",
      credential: "Licensed Mental Health Counselor",
      experience: "12 years in practice",
      languages: ["English", "Mandarin"],
      consultationFee: "₱10,200",
      initials: "MC",
      availableSlots: ["08:00 AM", "11:00 AM", "03:00 PM"],
    },
    {
      id: 3,
      name: "Counselor Emily Rodriguez",
      specialization: "Family Support",
      credential: "Licensed Family Counselor",
      experience: "10 years in practice",
      languages: ["English", "Spanish", "Portuguese"],
      consultationFee: "₱6,800",
      initials: "ER",
      availableSlots: ["09:30 AM", "01:00 PM", "03:30 PM", "05:00 PM"],
    },
    {
      id: 4,
      name: "Counselor James Wilson",
      specialization: "Physical Wellness",
      credential: "Licensed Wellness Counselor",
      experience: "18 years in practice",
      languages: ["English"],
      consultationFee: "₱11,300",
      initials: "JW",
      availableSlots: ["10:00 AM", "02:30 PM", "04:30 PM"],
    },
    {
      id: 5,
      name: "Counselor Priya Sharma",
      specialization: "Nutrition & Lifestyle",
      credential: "Certified Nutrition Counselor",
      experience: "8 years in practice",
      languages: ["English", "Hindi"],
      consultationFee: "₱7,400",
      initials: "PS",
      availableSlots: ["08:30 AM", "11:30 AM", "02:00 PM", "04:00 PM"],
    },
    {
      id: 6,
      name: "Counselor Robert Martinez",
      specialization: "General Well-being",
      credential: "Licensed Guidance Counselor",
      experience: "20 years in practice",
      languages: ["English", "Spanish"],
      consultationFee: "₱9,600",
      initials: "RM",
      availableSlots: ["09:00 AM", "12:00 PM", "03:00 PM"],
    },
  ];

  const specializations = [
    "all",
    "General Well-being",
    "Mental Health",
    "Family Support",
    "Physical Wellness",
    "Nutrition & Lifestyle",
  ];

  const filteredCounselors =
    selectedSpecialization === "all"
      ? patientCounselors
      : patientCounselors.filter(
          (counselor) => counselor.specialization === selectedSpecialization,
        );

  const handleBookAppointment = (counselor, timeSlot) => {
    setSelectedPatientCounselor(counselor);
    setSelectedTimeSlot(timeSlot);
    setShowBookingModal(true);
  };

  const handleConfirmBooking = () => {
    alert(
      `Patient Appointment booked with ${selectedPatientCounselor.name} on ${selectedDate} at ${selectedTimeSlot}`,
    );
    setShowBookingModal(false);
    setSelectedPatientCounselor(null);
    setSelectedTimeSlot(null);
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
          <Link to="/patient-appointment" className="sidebar-menu-item active">
            Patient Appointment
          </Link>
          <Link to="/settings" className="sidebar-menu-item">
            Account Settings
          </Link>
        </div>

        <div className="main-content-area">
          <div className="background-blur"></div>

          <div className="content-header">
            <h2 className="content-title">Patient Appointment</h2>
          </div>

          {/* Filter Section */}
          <div className="filter-section">
            <div className="filter-group">
              <label htmlFor="specialization">Counseling Type:</label>
              <select
                id="specialization"
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="filter-select"
              >
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec === "all" ? "All Types" : spec}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="date">Select Date:</label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="filter-date"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Counselors Grid */}
          <div className="patients-grid">
            {filteredCounselors.map((counselor) => (
              <div key={counselor.id} className="patient-card">
                <div className="patient-header">
                  <div className="patient-avatar" aria-label={`${counselor.name} initials`}>
                    {counselor.initials}
                  </div>
                  <div className="patient-info">
                    <h3 className="patient-name">{counselor.name}</h3>
                    <p className="patient-specialization">{counselor.credential}</p>
                    <div className="patient-meta">
                      <span className="patient-experience">
                        {counselor.experience}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="patient-details">
                  <div className="detail-row">
                    <span className="detail-label">Languages:</span>
                    <span className="detail-value">
                      {counselor.languages.join(", ")}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Consultation Fee:</span>
                    <span className="detail-value fee">
                      {counselor.consultationFee}
                    </span>
                  </div>
                </div>

                <div className="time-slots-section">
                  <h4 className="slots-title">Choose an appointment time</h4>
                  <div className="time-slots">
                    {counselor.availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        className="time-slot-btn"
                        onClick={() => handleBookAppointment(counselor, slot)}
                      >
                        Book {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCounselors.length === 0 && (
            <div className="no-results">
              <p>No counselors found for the selected type.</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedPatientCounselor && (
        <div
          className="modal-overlay"
          onClick={() => setShowBookingModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Appointment</h2>
              <button
                className="modal-close"
                onClick={() => setShowBookingModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="booking-summary">
                <div className="summary-row">
                  <span className="summary-label">Counselor:</span>
                  <span className="summary-value">
                    {selectedPatientCounselor.name}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Type:</span>
                  <span className="summary-value">
                    {selectedPatientCounselor.specialization}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Date:</span>
                  <span className="summary-value">
                    {new Date(selectedDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Time:</span>
                  <span className="summary-value">{selectedTimeSlot}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Consultation Fee:</span>
                  <span className="summary-value fee">
                    {selectedPatientCounselor.consultationFee}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowBookingModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={handleConfirmBooking}
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PatientAppointment;
