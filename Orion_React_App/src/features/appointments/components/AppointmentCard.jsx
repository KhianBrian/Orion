import { Button, ButtonLink } from "../../../components/ui/Button";
import { isInDemoMeetingWindow } from "../../../lib/appointmentTiming";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";

const manilaDateTime = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export function AppointmentCard({ appointment, isPatient, isUpcoming, now, onCancel }) {
  const canJoin = appointment.status === "booked" && isInDemoMeetingWindow(appointment.starts_at, appointment.ends_at, now);

  return <article className="appointment-card">
    <div className="appointment-card__heading">
      <h3>{appointment.counterpart_display_name || (isPatient ? "Assigned psychiatrist" : "Assigned patient")}</h3>
      <AppointmentStatusBadge status={appointment.status} />
    </div>
    <p>{manilaDateTime.format(new Date(appointment.starts_at))}</p>
    <p className="appointment-card__duration">45 minutes</p>
    <div className="appointment-card__actions">
      {canJoin && <ButtonLink to={`/appointments/${appointment.id}/meeting`}>Join call</ButtonLink>}
      {isPatient && isUpcoming && appointment.status === "booked" && <Button variant="danger" onClick={() => onCancel(appointment)}>Cancel appointment</Button>}
    </div>
  </article>;
}
