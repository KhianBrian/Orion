import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/authContext";
import { supabase } from "../lib/supabase";
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
  const [appointments, setAppointments] = useState([]);
  const [state, setState] = useState("loading");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancellationRequestId, setCancellationRequestId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState(null);
  const loadAppointments = useCallback(async () => {
    setState("loading");
    const { data, error } = await supabase.from("appointments").select("id, starts_at, ends_at, status, psychiatrist:psychiatrists!appointments_psychiatrist_id_fkey(display_name)").order("starts_at", { ascending: true });
    if (error) return setState("error");
    setAppointments(data || []);
    setState(data?.length ? "ready" : "empty");
  }, []);

  const selectAppointmentForCancellation = (appointment) => {
    setSelectedAppointment(appointment);
    setCancellationRequestId(crypto.randomUUID());
    setMessage(null);
  };

  const confirmCancellation = async () => {
    if (!selectedAppointment || !cancellationRequestId) return;
    setCancelling(true);
    setMessage(null);
    const { error } = await supabase.functions.invoke("cancel-appointment", {
      body: { appointmentId: selectedAppointment.id, idempotencyKey: cancellationRequestId },
    });
    if (error) {
      if (await errorCode(error) === "cancellation_not_permitted") {
        setMessage({ kind: "error", text: "This appointment can no longer be cancelled under the cancellation policy." });
      } else {
        setMessage({ kind: "error", text: "We could not complete the cancellation. Please try again." });
      }
      setCancelling(false);
      return;
    }
    setSelectedAppointment(null);
    setCancellationRequestId(null);
    setMessage({ kind: "success", text: "Your appointment has been cancelled." });
    setCancelling(false);
    await loadAppointments();
  };

  useEffect(() => {
    const frame = requestAnimationFrame(loadAppointments);
    return () => cancelAnimationFrame(frame);
  }, [loadAppointments]);
  const isPatient = profile.role === "patient";
  return <main className="scheduling-page">
    <div className="scheduling-header"><div><p className="eyebrow">Synthetic demo</p><h1>{isPatient ? "My appointments" : "Assigned appointments"}</h1><p>Times are shown in Manila time. Appointment access is determined by server-side policy.</p></div>{isPatient && <Link className="action-button" to="/patient-appointment">Book an appointment</Link>}</div>
    {state === "loading" && <p role="status">Loading appointments…</p>}
    {state === "error" && <div className="schedule-message error"><p>Appointments could not be loaded.</p><button onClick={loadAppointments}>Try again</button></div>}
    {state === "empty" && <p role="status">No appointments are scheduled.</p>}
    {message && <p role="status" className={`schedule-message ${message.kind}`}>{message.text}</p>}
    {state === "ready" && <section className="slot-list" aria-label="Appointments">{appointments.map((appointment) => <article className="slot-card" key={appointment.id}><h2>{isPatient ? psychiatristName(appointment) : "Assigned patient appointment"}</h2><p>{manilaDateTime.format(new Date(appointment.starts_at))}</p><p className="slot-duration">45 minutes · {appointment.status}</p>{isPatient && appointment.status === "booked" && <button onClick={() => selectAppointmentForCancellation(appointment)}>Cancel appointment</button>}</article>)}</section>}
    {selectedAppointment && <section className="booking-confirmation" aria-labelledby="cancel-appointment-title"><h2 id="cancel-appointment-title">Cancel this appointment?</h2><p>{psychiatristName(selectedAppointment)} — {manilaDateTime.format(new Date(selectedAppointment.starts_at))}</p><p>Patient cancellations are allowed only more than 24 hours before the appointment. The server will confirm whether this appointment is eligible.</p><div className="booking-actions"><button onClick={confirmCancellation} disabled={cancelling}>{cancelling ? "Cancelling…" : "Confirm cancellation"}</button><button className="secondary-action-button" onClick={() => { setSelectedAppointment(null); setCancellationRequestId(null); }}>Keep appointment</button></div></section>}
  </main>;
}
