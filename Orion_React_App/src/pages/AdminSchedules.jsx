import { useQuery } from "@tanstack/react-query";
import { BackButton } from "../components/ui/BackButton";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { manageSchedule } from "../features/appointments/mutations";
import { useAuth } from "../features/auth/authContext";
import "./PatientAppointment.css";

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

async function loadSchedules() {
  const { data, error } = await manageSchedule({ action: "admin-list" });
  if (error) throw error;
  return data?.schedule || [];
}

export default function AdminSchedules() {
  const { profile } = useAuth();
  const query = useQuery({ queryKey: ["admin-schedules", profile.id], queryFn: loadSchedules });
  const schedule = query.data || [];
  const psychiatrists = [...new Map(schedule.map((item) => [item.psychiatrist_id, { id: item.psychiatrist_id, name: item.psychiatrist_display_name }])).values()];

  return <section className="scheduling-page">
    <div className="scheduling-header"><div><p className="eyebrow">Administrator access</p><h1>Psychiatrist schedules</h1><p>Read-only schedule visibility. Psychiatrists manage their own normal-hour schedules; outside-hours availability requires approval.</p></div><BackButton label="Appointment operations" to="/admin-appointments" /></div>
    <StatusMessage tone="info">Booked appointments are protected from silent movement or deletion. Conflicting schedule changes are blocked for the psychiatrist to resolve.</StatusMessage>
    {query.isPending && <StatusMessage>Loading psychiatrist schedules…</StatusMessage>}
    {query.error && <StatusMessage tone="error">Psychiatrist schedules could not be loaded.</StatusMessage>}
    {!query.isPending && !query.error && !psychiatrists.length && <StatusMessage>No psychiatrist schedules are available.</StatusMessage>}
    {!query.isPending && !query.error && psychiatrists.map((psychiatrist) => <section className="schedule-editor" aria-labelledby={`schedule-${psychiatrist.id}`} key={psychiatrist.id}><div className="booking-step__heading"><span className="booking-step__number" aria-hidden="true">✓</span><div><h2 id={`schedule-${psychiatrist.id}`}>{psychiatrist.name}</h2><p>Schedule records</p></div></div><div className="schedule-record-list">{schedule.filter((item) => item.psychiatrist_id === psychiatrist.id).map((item) => <div className="schedule-record" key={item.record_type + item.id}><span>{item.record_type === "rule" ? `${dayNames[item.weekday - 1]} · ` : `${item.local_date} · `}{item.starts_local.slice(0, 5)}–{item.ends_local.slice(0, 5)}{item.kind ? ` · ${item.kind}` : ""}</span><strong>{item.approval_status || "active"}</strong></div>)}</div></section>)}
    <Button variant="quiet" onClick={() => query.refetch()}>Refresh schedules</Button>
  </section>;
}
