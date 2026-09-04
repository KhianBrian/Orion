import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { appointmentQueryKey, fetchAppointments } from "../features/appointments/queries";
import { useAuth } from "../features/auth/authContext";
import { isInDemoMeetingWindow } from "../lib/appointmentTiming";
import { supabase } from "../lib/supabase";
import { useMeetingWindowClock } from "../lib/useMeetingWindowClock";
import "./PatientAppointment.css";

const manilaDateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Manila" });

function psychiatristName(appointment) {
  const psychiatrist = Array.isArray(appointment.psychiatrist) ? appointment.psychiatrist[0] : appointment.psychiatrist;
  return psychiatrist?.display_name || "Assigned psychiatrist";
}

async function errorCode(error) {
  if (error?.context instanceof Response) {
    try {
      return (await error.context.json()).error;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export default function Appointments() {
  const { profile } = useAuth();
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancellationRequestId, setCancellationRequestId] = useState(null);
  const [message, setMessage] = useState(null);
  const client = useQueryClient();
  const { data: appointments = [], error, isPending, refetch } = useQuery({
    queryKey: appointmentQueryKey(profile.id),
    queryFn: fetchAppointments,
  });
  const cancellation = useMutation({
    mutationFn: ({ appointmentId, idempotencyKey }) => supabase.functions.invoke("cancel-appointment", {
      body: { appointmentId, idempotencyKey },
    }),
  });
  const now = useMeetingWindowClock(appointments);

  const selectAppointmentForCancellation = (appointment) => {
    setSelectedAppointment(appointment);
    setCancellationRequestId(crypto.randomUUID());
    setMessage(null);
  };

  const confirmCancellation = async () => {
    if (!selectedAppointment || !cancellationRequestId) return;
    setMessage(null);
    try {
      const { error: mutationError } = await cancellation.mutateAsync({
        appointmentId: selectedAppointment.id,
        idempotencyKey: cancellationRequestId,
      });
      if (mutationError) throw mutationError;
    } catch (mutationError) {
      if (await errorCode(mutationError) === "cancellation_not_permitted") {
        setMessage({ kind: "error", text: "This appointment can no longer be cancelled under the cancellation policy." });
      } else {
        setMessage({ kind: "error", text: "We could not complete the cancellation. Please try again." });
      }
      return;
    }

    setSelectedAppointment(null);
    setCancellationRequestId(null);
    setMessage({ kind: "success", text: "Your appointment has been cancelled." });
    await client.invalidateQueries({ queryKey: appointmentQueryKey(profile.id) });
  };

  const isPatient = profile.role === "patient";
  return <main className="scheduling-page">
    <div className="scheduling-header"><div><p className="eyebrow">Synthetic demo</p><h1>{isPatient ? "My appointments" : "Assigned appointments"}</h1><p>Times are shown in Manila time. Appointment access is determined by server-side policy.</p></div>{isPatient && <Link className="action-button" to="/patient-appointment">Book an appointment</Link>}</div>
    {isPending && <p role="status">Loading appointments…</p>}
    {error && <div className="schedule-message error"><p>Appointments could not be loaded.</p><button onClick={() => refetch()}>Try again</button></div>}
    {!isPending && !error && !appointments.length && <p role="status">No appointments are scheduled.</p>}
    {message && <p role="status" className={`schedule-message ${message.kind}`}>{message.text}</p>}
    {!isPending && !error && appointments.length > 0 && <section className="slot-list" aria-label="Appointments">{appointments.map((appointment) => <article className="slot-card" key={appointment.id}><h2>{isPatient ? psychiatristName(appointment) : "Assigned patient appointment"}</h2><p>{manilaDateTime.format(new Date(appointment.starts_at))}</p><p className="slot-duration">45 minutes · {appointment.status}</p>{appointment.status === "booked" && isInDemoMeetingWindow(appointment.starts_at, appointment.ends_at, now) && <Link className="action-button" to={`/appointments/${appointment.id}/meeting`}>Join synthetic demo call</Link>}{isPatient && appointment.status === "booked" && <button onClick={() => selectAppointmentForCancellation(appointment)}>Cancel appointment</button>}</article>)}</section>}
    {selectedAppointment && <section className="booking-confirmation" aria-labelledby="cancel-appointment-title"><h2 id="cancel-appointment-title">Cancel this appointment?</h2><p>{psychiatristName(selectedAppointment)} — {manilaDateTime.format(new Date(selectedAppointment.starts_at))}</p><p>Patient cancellations are allowed only more than 24 hours before the appointment. The server will confirm whether this appointment is eligible.</p><div className="booking-actions"><button onClick={confirmCancellation} disabled={cancellation.isPending}>{cancellation.isPending ? "Cancelling…" : "Confirm cancellation"}</button><button className="secondary-action-button" onClick={() => { setSelectedAppointment(null); setCancellationRequestId(null); }}>Keep appointment</button></div></section>}
  </main>;
}
