import { AppointmentCard } from "./AppointmentCard";

function isUpcoming(appointment, now) {
  return appointment.status === "booked" && new Date(appointment.ends_at).getTime() >= new Date(now).getTime();
}

export function AppointmentList({ appointments, isPatient, now, onCancel }) {
  const upcoming = appointments.filter((appointment) => isUpcoming(appointment, now));
  const history = appointments.filter((appointment) => !isUpcoming(appointment, now));

  return <section aria-label="Appointments" className="appointment-list">
    <section aria-labelledby="upcoming-appointments-heading">
      <h2 id="upcoming-appointments-heading">Upcoming appointments</h2>
      {upcoming.length ? <div className="appointment-list__grid">{upcoming.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} isPatient={isPatient} isUpcoming now={now} onCancel={onCancel} />)}</div> : <p className="appointment-list__empty">No upcoming appointments.</p>}
    </section>
    {history.length > 0 && <section aria-labelledby="appointment-history-heading" className="appointment-list__history">
      <h2 id="appointment-history-heading">Appointment history</h2>
      <div className="appointment-list__grid">{history.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} isPatient={isPatient} isUpcoming={false} now={now} onCancel={onCancel} />)}</div>
    </section>}
  </section>;
}
