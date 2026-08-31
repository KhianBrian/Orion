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

export default function Appointments() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [state, setState] = useState("loading");
  const loadAppointments = useCallback(async () => {
    setState("loading");
    const { data, error } = await supabase.from("appointments").select("id, starts_at, ends_at, status, psychiatrist:psychiatrists!appointments_psychiatrist_id_fkey(display_name)").order("starts_at", { ascending: true });
    if (error) return setState("error");
    setAppointments(data || []);
    setState(data?.length ? "ready" : "empty");
  }, []);
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
    {state === "ready" && <section className="slot-list" aria-label="Appointments">{appointments.map((appointment) => <article className="slot-card" key={appointment.id}><h2>{isPatient ? psychiatristName(appointment) : "Assigned patient appointment"}</h2><p>{manilaDateTime.format(new Date(appointment.starts_at))}</p><p className="slot-duration">45 minutes · {appointment.status}</p></article>)}</section>}
  </main>;
}
