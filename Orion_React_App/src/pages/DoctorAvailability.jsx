import { useState } from "react";
import { Link } from "react-router-dom";
import "../components/SidebarLayout.css";
import "./DoctorAvailability.css";

const DoctorAvailability = () => {
  const [selectedSpecialization, setSelectedSpecialization] = useState("all");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Mock data for doctors
  const doctors = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      specialization: "Cardiologist",
      experience: "15 years",
      rating: 4.8,
      languages: ["English", "Spanish"],
      consultationFee: "$150",
      image: "👩‍⚕️",
      availableSlots: ["09:00 AM", "10:30 AM", "02:00 PM", "04:00 PM"],
    },
    {
      id: 2,
      name: "Dr. Michael Chen",
      specialization: "Neurologist",
      experience: "12 years",
      rating: 4.9,
      languages: ["English", "Mandarin"],
      consultationFee: "$180",
      image: "👨‍⚕️",
      availableSlots: ["08:00 AM", "11:00 AM", "03:00 PM"],
    },
    {
      id: 3,
      name: "Dr. Emily Rodriguez",
      specialization: "Pediatrician",
      experience: "10 years",
      rating: 4.7,
      languages: ["English", "Spanish", "Portuguese"],
      consultationFee: "$120",
      image: "👩‍⚕️",
      availableSlots: ["09:30 AM", "01:00 PM", "03:30 PM", "05:00 PM"],
    },
    {
      id: 4,
      name: "Dr. James Wilson",
      specialization: "Orthopedic",
      experience: "18 years",
      rating: 4.9,
      languages: ["English"],
      consultationFee: "$200",
      image: "👨‍⚕️",
      availableSlots: ["10:00 AM", "02:30 PM", "04:30 PM"],
    },
    {
      id: 5,
      name: "Dr. Priya Sharma",
      specialization: "Dermatologist",
      experience: "8 years",
      rating: 4.6,
      languages: ["English", "Hindi"],
      consultationFee: "$130",
      image: "👩‍⚕️",
      availableSlots: ["08:30 AM", "11:30 AM", "02:00 PM", "04:00 PM"],
    },
    {
      id: 6,
      name: "Dr. Robert Martinez",
      specialization: "Cardiologist",
      experience: "20 years",
      rating: 4.8,
      languages: ["English", "Spanish"],
      consultationFee: "$170",
      image: "👨‍⚕️",
      availableSlots: ["09:00 AM", "12:00 PM", "03:00 PM"],
    },
  ];

  const specializations = [
    "all",
    "Cardiologist",
    "Neurologist",
    "Pediatrician",
    "Orthopedic",
    "Dermatologist",
  ];

  const filteredDoctors =
    selectedSpecialization === "all"
      ? doctors
      : doctors.filter((doc) => doc.specialization === selectedSpecialization);

  const handleBookAppointment = (doctor, timeSlot) => {
    setSelectedDoctor(doctor);
    setSelectedTimeSlot(timeSlot);
    setShowBookingModal(true);
  };

  const handleConfirmBooking = () => {
    alert(
      `Appointment booked with ${selectedDoctor.name} on ${selectedDate} at ${selectedTimeSlot}`,
    );
    setShowBookingModal(false);
    setSelectedDoctor(null);
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
          <Link to="/doctor-availability" className="sidebar-menu-item active">
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
            <h2 className="content-title">Doctor Availability</h2>
          </div>

          {/* Filter Section */}
          <div className="filter-section">
            <div className="filter-group">
              <label htmlFor="specialization">Specialization:</label>
              <select
                id="specialization"
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="filter-select"
              >
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec === "all" ? "All Specializations" : spec}
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

          {/* Doctor Cards Grid */}
          <div className="doctors-grid">
            {filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="doctor-card">
                <div className="doctor-header">
                  <div className="doctor-avatar">{doctor.image}</div>
                  <div className="doctor-info">
                    <h3 className="doctor-name">{doctor.name}</h3>
                    <p className="doctor-specialization">
                      {doctor.specialization}
                    </p>
                    <div className="doctor-meta">
                      <span className="doctor-rating">⭐ {doctor.rating}</span>
                      <span className="doctor-experience">
                        {doctor.experience} exp
                      </span>
                    </div>
                  </div>
                </div>

                <div className="doctor-details">
                  <div className="detail-row">
                    <span className="detail-label">Languages:</span>
                    <span className="detail-value">
                      {doctor.languages.join(", ")}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Consultation Fee:</span>
                    <span className="detail-value fee">
                      {doctor.consultationFee}
                    </span>
                  </div>
                </div>

                <div className="time-slots-section">
                  <h4 className="slots-title">Available Time Slots</h4>
                  <div className="time-slots">
                    {doctor.availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        className="time-slot-btn"
                        onClick={() => handleBookAppointment(doctor, slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDoctors.length === 0 && (
            <div className="no-results">
              <p>No doctors found for the selected specialization.</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedDoctor && (
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
                  <span className="summary-label">Doctor:</span>
                  <span className="summary-value">{selectedDoctor.name}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Specialization:</span>
                  <span className="summary-value">
                    {selectedDoctor.specialization}
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
                    {selectedDoctor.consultationFee}
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

export default DoctorAvailability;
