import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRoleNavigation } from "../constants/routes";
import { useAuth } from "../features/auth/authContext";
import { Button, ButtonLink } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { SessionNoteDialog } from "../features/appointments/components/SessionNoteDialog";
import { appointmentQueryKey, fetchAdminAppointments, fetchAdminSchedules, fetchAppointments, fetchSessionNoteIndex, sessionNotesQueryKey } from "../features/appointments/queries";
import { fetchSupportTickets, supportTicketsQueryKey } from "../features/support/queries";
import "./AccountHome.css";

const roleLabels = { admin: "Administrator", patient: "Patient", psychiatrist: "Psychiatrist" };
const manilaDate = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });
const manilaTime = new Intl.DateTimeFormat("en-PH", { timeStyle: "short", timeZone: "Asia/Manila" });
const manilaDay = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Manila" });

function isToday(date) {
  return manilaDay.format(new Date(date)) === manilaDay.format(new Date());
}

function sortByStart(items) {
  return [...items].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
}

function LoadingBlock({ label }) {
  return <div className="account-widget__state">{label}</div>;
}

function PatientDashboard({ profile }) {
  const [selectedNote, setSelectedNote] = useState(null);
  const appointmentsQuery = useQuery({ queryKey: appointmentQueryKey(profile.id), queryFn: fetchAppointments });
  const notesQuery = useQuery({ queryKey: sessionNotesQueryKey(profile.id), queryFn: fetchSessionNoteIndex, retry: 1 });
  const appointments = appointmentsQuery.data || [];
  const noteByAppointment = useMemo(() => new Map((notesQuery.data || []).map((note) => [note.appointment_id, note])), [notesQuery.data]);
  const completedSessions = sortByStart(appointments.filter((appointment) => appointment.status === "completed" && new Date(appointment.ends_at) < new Date()));
  const nextAppointment = sortByStart(appointments.filter((appointment) => appointment.status === "booked" && new Date(appointment.ends_at) >= new Date()))[0];

  return <div className="account-role-dashboard">
    <section className="account-widget account-widget--next" aria-labelledby="next-appointment-title">
      <div className="account-widget__header"><div><h2 id="next-appointment-title">Next appointment</h2></div><span className="account-widget__status">{nextAppointment ? "Confirmed" : "Open"}</span></div>
      {appointmentsQuery.isPending ? <LoadingBlock label="Loading your appointments…" /> : appointmentsQuery.error ? <StatusMessage tone="error">We could not load your next appointment.</StatusMessage> : nextAppointment ? <div className="next-appointment"><div className="next-appointment__date"><strong>{manilaDate.format(new Date(nextAppointment.starts_at))}</strong><span>{manilaTime.format(new Date(nextAppointment.starts_at))}–{manilaTime.format(new Date(nextAppointment.ends_at))}</span></div><div><h3>{nextAppointment.counterpart_display_name || "Assigned psychiatrist"}</h3><p>45-minute session · Manila time</p></div><ButtonLink to="/appointments">View details <span aria-hidden="true">→</span></ButtonLink></div> : <div className="account-widget__empty"><p>You do not have an upcoming appointment yet.</p><ButtonLink to="/patient-appointment">Find a time that works <span aria-hidden="true">→</span></ButtonLink></div>}
    </section>
    <section className="account-widget account-widget--record" aria-labelledby="prior-sessions-title">
      <div className="account-widget__header"><div><h2 id="prior-sessions-title">Care journal</h2><p className="account-widget__lede">A private timeline of completed sessions and notes your psychiatrist has released to you.</p></div><span className="account-widget__count">{completedSessions.length} session{completedSessions.length === 1 ? "" : "s"}</span></div>
      {appointmentsQuery.isPending ? <LoadingBlock label="Loading your session history…" /> : appointmentsQuery.error ? <StatusMessage tone="error">Session history could not be loaded. Please try again from Appointments.</StatusMessage> : completedSessions.length ? <>
        {notesQuery.error && <div className="note-index-warning" role="status"><span>Notes are temporarily unavailable.</span><Button variant="quiet" onClick={() => notesQuery.refetch()} busy={notesQuery.isFetching}>Try again</Button></div>}
        <div className="prior-session-list">{completedSessions.slice(-4).reverse().map((session, index) => { const note = noteByAppointment.get(session.id); return <article className="prior-session" key={session.id}><div className="prior-session__marker" aria-hidden="true">{String(completedSessions.length - index).padStart(2, "0")}</div><div className="prior-session__details"><strong>{manilaDate.format(new Date(session.starts_at))}</strong><span>{manilaTime.format(new Date(session.starts_at))} · {session.counterpart_display_name || "Psychiatrist"}</span></div>{note ? <Button variant="quiet" onClick={() => setSelectedNote(session)}>Read note <span aria-hidden="true">→</span></Button> : <span className="prior-session__muted">{notesQuery.error ? "Note unavailable" : "No released note"}</span>}</article>; })}</div>
      </> : <div className="account-widget__empty"><p>Completed sessions and released notes will appear here.</p><ButtonLink variant="quiet" to="/appointments">View appointment history <span aria-hidden="true">→</span></ButtonLink></div>}
    </section>
    <section className="account-widget account-widget--preparation" aria-labelledby="preparation-title"><div className="account-widget__header"><div><h2 id="preparation-title">A few useful reminders</h2></div><span aria-hidden="true" className="account-widget__icon">✦</span></div><ul className="preparation-list"><li>Check the appointment time in Manila time.</li><li>Choose a private, comfortable place for your session.</li><li>Use Support for account or scheduling questions.</li></ul></section>
    <SessionNoteDialog appointment={selectedNote} note={selectedNote ? noteByAppointment.get(selectedNote.id) : null} isPatient accountId={profile.id} onClose={() => setSelectedNote(null)} />
  </div>;
}

function PsychiatristDashboard({ profile }) {
  const query = useQuery({ queryKey: appointmentQueryKey(profile.id), queryFn: fetchAppointments });
  const sessions = sortByStart((query.data || []).filter((appointment) => appointment.status === "booked" && isToday(appointment.starts_at)));
  const upcoming = sortByStart((query.data || []).filter((appointment) => appointment.status === "booked" && new Date(appointment.ends_at) >= new Date()));
  const visibleSessions = sessions.length ? sessions : upcoming.slice(0, 4);

  return <div className="account-role-dashboard">
    <section className="account-widget psychiatrist-calendar" aria-labelledby="today-schedule-title"><div className="account-widget__header"><div><p className="account-home__kicker">Today · Asia/Manila</p><h2 id="today-schedule-title">Scheduled sessions</h2></div><ButtonLink variant="quiet" to="/appointments">View all <span aria-hidden="true">→</span></ButtonLink></div>{query.isPending ? <LoadingBlock label="Loading your schedule…" /> : query.error ? <StatusMessage tone="error">Your scheduled sessions could not be loaded.</StatusMessage> : visibleSessions.length ? <div className="psychiatrist-timeline">{visibleSessions.map((session) => <article className="psychiatrist-session" key={session.id}><div className="psychiatrist-session__time"><strong>{manilaTime.format(new Date(session.starts_at))}</strong><span>{manilaTime.format(new Date(session.ends_at))}</span></div><div className="psychiatrist-session__line" aria-hidden="true" /><div className="psychiatrist-session__body"><h3>{session.counterpart_display_name || "Assigned patient"}</h3><p>45-minute appointment</p><span className="psychiatrist-session__status">{isToday(session.starts_at) ? "Scheduled today" : manilaDate.format(new Date(session.starts_at))}</span></div></article>)}</div> : <div className="account-widget__empty"><p>No sessions are scheduled for today.</p><ButtonLink variant="quiet" to="/schedule">Review my availability <span aria-hidden="true">→</span></ButtonLink></div>}</section>
    <section className="account-widget psychiatrist-summary" aria-labelledby="schedule-summary-title"><p className="account-home__kicker">Keep the day moving</p><h2 id="schedule-summary-title">Your clinical workspace</h2><div className="account-summary-grid"><div><strong>{sessions.length}</strong><span>today</span></div><div><strong>{upcoming.length}</strong><span>upcoming</span></div><div><strong>45</strong><span>minutes each</span></div></div><ButtonLink to="/schedule">Manage availability <span aria-hidden="true">→</span></ButtonLink></section>
  </div>;
}

function AdminDashboard({ profile }) {
  const appointmentsQuery = useQuery({ queryKey: appointmentQueryKey(profile.id), queryFn: fetchAdminAppointments });
  const supportQuery = useQuery({ queryKey: supportTicketsQueryKey(profile.id), queryFn: fetchSupportTickets });
  const schedulesQuery = useQuery({ queryKey: ["admin-schedules", profile.id], queryFn: fetchAdminSchedules });
  const appointments = appointmentsQuery.data || [];
  const tickets = supportQuery.data?.tickets || [];
  const schedules = schedulesQuery.data || [];
  const openTickets = tickets.filter((ticket) => ticket.status_code !== "closed").length;
  const activeAppointments = appointments.filter((appointment) => appointment.status === "booked").length;
  const activePsychiatrists = new Set(schedules.map((item) => item.psychiatrist_id)).size;

  return <div className="account-role-dashboard account-role-dashboard--admin">
    <section className="admin-summary-grid" aria-label="Operations summary"><div className="admin-stat admin-stat--blue"><span>Booked appointments</span><strong>{appointmentsQuery.isPending ? "—" : activeAppointments}</strong><ButtonLink variant="quiet" to="/admin-appointments">Open operations <span aria-hidden="true">→</span></ButtonLink></div><div className="admin-stat admin-stat--rose"><span>Open support requests</span><strong>{supportQuery.isPending ? "—" : openTickets}</strong><ButtonLink variant="quiet" to="/support">Review queue <span aria-hidden="true">→</span></ButtonLink></div><div className="admin-stat admin-stat--green"><span>Psychiatrists with schedules</span><strong>{schedulesQuery.isPending ? "—" : activePsychiatrists}</strong><ButtonLink variant="quiet" to="/admin-schedules">View schedules <span aria-hidden="true">→</span></ButtonLink></div></section>
    <section className="account-widget admin-alerts" aria-labelledby="admin-alerts-title"><div className="account-widget__header"><div><p className="account-home__kicker">Operations watch</p><h2 id="admin-alerts-title">Recent activity</h2></div><span className="account-widget__status">Live summary</span></div>{appointmentsQuery.error || supportQuery.error || schedulesQuery.error ? <StatusMessage tone="error">One or more operational summaries could not be loaded.</StatusMessage> : <ul className="admin-activity-list"><li><span className="admin-activity-list__dot admin-activity-list__dot--blue" />Booking operations currently show <strong>{activeAppointments} booked appointment{activeAppointments === 1 ? "" : "s"}</strong>.</li><li><span className="admin-activity-list__dot admin-activity-list__dot--rose" />There {openTickets === 1 ? "is" : "are"} <strong>{openTickets} open support request{openTickets === 1 ? "" : "s"}</strong> requiring review.</li><li><span className="admin-activity-list__dot admin-activity-list__dot--green" />Schedule visibility covers <strong>{activePsychiatrists} psychiatrist{activePsychiatrists === 1 ? "" : "s"}</strong>.</li></ul>}</section>
  </div>;
}

export default function AccountHome() {
  const { profile, ability } = useAuth();
  const links = getRoleNavigation(profile.role).filter(({ subject }) => ability.can("visit", subject));
  const supportLink = links.find(({ path }) => path === "/support");
  const actionLinks = links.filter(({ path }) => path !== "/support");

  return <section className={`account-home account-home--${profile.role}`}>
    <div className="account-home__hero"><div>{profile.role !== "patient" && <p className="account-home__kicker">{profile.role === "psychiatrist" ? "Your clinical workspace" : "Your operations workspace"} · {roleLabels[profile.role]}</p>}<h1>Welcome, {profile.full_name}</h1><p className="account-home__intro">{profile.role === "patient" ? "Your appointments, session history, and next useful step are here." : profile.role === "psychiatrist" ? "Keep your schedule visible, review assigned sessions, and stay ready for the day." : "Keep scheduling operations, support requests, and availability in view."}</p><div className="account-actions">{actionLinks.map(({ label, path }, index) => <ButtonLink className={index === 0 ? "account-action--primary" : "account-action--secondary"} key={path} to={path}>{label}</ButtonLink>)}</div></div>{supportLink && <ButtonLink className="account-support-link" variant="secondary" to={supportLink.path}><span className="account-support-link__label">Need help?</span>{supportLink.label}<span aria-hidden="true"> →</span></ButtonLink>}</div>
    {profile.role === "patient" && <PatientDashboard profile={profile} />}
    {profile.role === "psychiatrist" && <PsychiatristDashboard profile={profile} />}
    {profile.role === "admin" && <AdminDashboard profile={profile} />}
  </section>;
}
