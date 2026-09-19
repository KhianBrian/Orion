import { Button, ButtonLink } from "../../../components/ui/Button";
import { isInMeetingWindow } from "../../../lib/appointmentTiming";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";

const manilaDateTime = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export function AppointmentCard({ appointment, isPatient, isUpcoming, now, onCancel, onReschedule, onClinicianCancel, onOutcome, onNote, noteAvailable }) {
  const canJoin = appointment.status === "booked" && isInMeetingWindow(appointment.starts_at, appointment.ends_at, now);
  return <article className="appointment-card" data-testid={`appointment-card-${appointment.id}`}>
    <div className="appointment-card__heading">
      <h3>{appointment.counterpart_display_name || (isPatient ? "Assigned psychiatrist" : "Assigned patient")}</h3>
      <AppointmentStatusBadge status={appointment.status} />
    </div>
    <p>{manilaDateTime.format(new Date(appointment.starts_at))}</p>
    <p className="appointment-card__duration">45 minutes</p>
    <div className="appointment-card__actions">
      {canJoin && <ButtonLink to={`/appointments/${appointment.id}/google-meeting`}>Join Google Meet</ButtonLink>}
      {isPatient && isUpcoming && appointment.status === "booked" && <Button variant="danger" onClick={() => onCancel(appointment)}>Cancel appointment</Button>}
      {isPatient && isUpcoming && appointment.status === "booked" && <Button variant="secondary" onClick={() => onReschedule(appointment)}>Request reschedule</Button>}
      {!isPatient && isUpcoming && appointment.status === "booked" && <Button variant="danger" onClick={() => onClinicianCancel(appointment)}>Cancel appointment</Button>}
      {!isPatient && appointment.status === "booked" && new Date(now).getTime() >= new Date(appointment.starts_at).getTime() && <>
        <Button variant="secondary" onClick={() => onOutcome(appointment, "completed")}>Mark completed</Button>
        <Button variant="secondary" onClick={() => onOutcome(appointment, "no_show")}>Record no-show</Button>
      </>}
      {((!isPatient && (appointment.status === "booked" || appointment.status === "completed")) || (isPatient && noteAvailable)) && <Button variant="quiet" onClick={() => onNote(appointment)}>Session note</Button>}
      {appointment.rescheduled_from_id && <p className="appointment-card__linkage">This appointment replaces an earlier appointment.</p>}
      {appointment.replacement_appointment_id && <p className="appointment-card__linkage">A replacement appointment is linked to this history.</p>}
    </div>
  </article>;
}
