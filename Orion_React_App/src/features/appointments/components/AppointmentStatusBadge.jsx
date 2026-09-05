const labels = {
  booked: "Booked",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No show",
};

export function AppointmentStatusBadge({ status }) {
  return <span className={`appointment-status appointment-status--${status}`}>{labels[status] || "Appointment"}</span>;
}
