import { useEffect, useState } from "react";
import { BackButton } from "../components/ui/BackButton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { appointmentErrorCode, manageSchedule } from "../features/appointments/mutations";
import { GoogleMeetConnectionCard } from "../features/appointments/components/GoogleMeetConnectionCard";
import { useAuth } from "../features/auth/authContext";
import "./PatientAppointment.css";

const manilaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });

const manilaDay = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "short" });
const manilaDayNumber = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", day: "numeric" });
const manilaLongDate = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric" });

// Manila has no daylight saving, so stepping by 24 hours always lands on the next calendar day.
function upcomingDays(count) {
  return Array.from({ length: count }, (_, index) => {
    const moment = new Date(Date.now() + index * 86400000);
    return { key: manilaDate.format(moment), name: manilaDay.format(moment), number: manilaDayNumber.format(moment) };
  });
}

function formatTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

async function loadSchedule() {
  const { data, error } = await manageSchedule({ action: "list" });
  if (error) throw error;
  return data?.schedule || [];
}

function friendlyError(error) {
  return appointmentErrorCode(error).then((code) => code === "schedule_conflict"
    ? "This change overlaps a booked appointment. Reschedule or cancel that appointment first, then try again."
    : "The schedule change could not be saved. Check the time range and try again.");
}

export default function PsychiatristSchedule() {
  const { profile } = useAuth();
  const client = useQueryClient();
  const [rule, setRule] = useState({ startsLocal: "08:00", endsLocal: "17:00" });
  const [override, setOverride] = useState({ date: manilaDate.format(new Date()), startsLocal: "08:00", endsLocal: "17:00", kind: "unavailable" });
  const [message, setMessage] = useState(null);
  const query = useQuery({ queryKey: ["schedule", profile.id], queryFn: loadSchedule });
  const mutation = useMutation({ mutationFn: manageSchedule });
  const save = async (action, values, successText) => {
    setMessage(null);
    try {
      const { error } = await mutation.mutateAsync({ action, ...values });
      if (error) throw error;
      setMessage({ tone: "success", text: successText });
      await client.invalidateQueries({ queryKey: ["schedule", profile.id] });
    } catch (error) {
      setMessage({ tone: "error", text: await friendlyError(error) });
    }
  };
  const overrides = (query.data || []).filter((item) => item.record_type === "override");
  const days = upcomingDays(7);
  const overrideDates = new Set(overrides.map((item) => item.local_date));
  useEffect(() => {
    const currentRule = (query.data || []).find((item) => item.record_type === "rule");
    if (currentRule) setRule({ startsLocal: currentRule.starts_local.slice(0, 5), endsLocal: currentRule.ends_local.slice(0, 5) });
  }, [query.data]);
  const saveRule = (event) => {
    event.preventDefault();
    save("save-weekly-rule", {
      startsLocal: rule.startsLocal,
      endsLocal: rule.endsLocal,
    }, "The recurring weekly period was saved.");
  };

  return <section className="scheduling-page">
    <div className="scheduling-header"><div><p className="eyebrow">Clinician schedule</p><h1>My availability</h1><p>Manage one recurring weekly period inside 8:00 AM–5:00 PM Asia/Manila. Booked appointments are never moved automatically.</p><p className="schedule-summary"><span className="schedule-summary__dot" aria-hidden="true" />Open every day · {formatTime(rule.startsLocal)} – {formatTime(rule.endsLocal)} Asia/Manila</p></div><BackButton label="My appointments" to="/appointments" /></div>
    {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}
    {query.isPending && <StatusMessage>Loading your schedule…</StatusMessage>}
    {query.error && <StatusMessage tone="error">Your schedule could not be loaded. Try refreshing the page.</StatusMessage>}
    <section className="schedule-editor" aria-labelledby="recurring-schedule-title"><div className="booking-step__heading"><span className="booking-step__number">1</span><div><h2 id="recurring-schedule-title">Recurring weekly period</h2><p>Applies Monday through Sunday. Changes apply only to future unbooked availability.</p></div></div><form className="schedule-form" onSubmit={saveRule}><label>Days<span className="schedule-form__value">Monday–Sunday</span></label><label>Starts<input type="time" step="900" min="08:00" max="16:15" value={rule.startsLocal} onChange={(event) => setRule({ ...rule, startsLocal: event.target.value })} /></label><label>Ends<input type="time" step="900" min="08:45" max="17:00" value={rule.endsLocal} onChange={(event) => setRule({ ...rule, endsLocal: event.target.value })} /></label><Button type="submit" busy={mutation.isPending}>Save weekly period</Button></form></section>
    <section className="schedule-editor" aria-labelledby="schedule-override-title"><div className="booking-step__heading"><span className="booking-step__number">2</span><div><h2 id="schedule-override-title">One-off date override</h2><p>Unavailable periods take precedence. Extra availability outside normal hours waits for admin approval.</p></div></div><div className="day-strip" role="group" aria-label="Choose a date for the override">{days.map((day) => <button type="button" key={day.key} className={`day-chip${override.date === day.key ? " day-chip--active" : ""}`} aria-pressed={override.date === day.key} onClick={() => setOverride({ ...override, date: day.key })}><span className="day-chip__number">{day.number}</span><span className="day-chip__name">{day.name}</span><span className={`day-chip__dot${overrideDates.has(day.key) ? " day-chip__dot--set" : ""}`} aria-hidden="true" /></button>)}</div>
    <p className="schedule-selected-date">Editing <strong>{override.date ? manilaLongDate.format(new Date(`${override.date}T12:00:00+08:00`)) : "choose a date"}</strong></p>
    <form className="schedule-form schedule-form--override" onSubmit={(event) => { event.preventDefault(); save("save-override", override, override.kind === "available" && (override.startsLocal < "08:00" || override.endsLocal > "17:00") ? "The outside-hours availability request was sent for admin approval." : "The date override was saved."); }}><label>Other date<input type="date" min={manilaDate.format(new Date())} value={override.date} onChange={(event) => setOverride({ ...override, date: event.target.value })} /></label><label>Starts<input type="time" step="900" value={override.startsLocal} onChange={(event) => setOverride({ ...override, startsLocal: event.target.value })} /></label><label>Ends<input type="time" step="900" value={override.endsLocal} onChange={(event) => setOverride({ ...override, endsLocal: event.target.value })} /></label><div className="segmented" role="group" aria-label="Override type">{[["unavailable", "Unavailable"], ["available", "Available"]].map(([kind, label]) => <button type="button" key={kind} className={`segmented__option${override.kind === kind ? " segmented__option--active" : ""}`} aria-pressed={override.kind === kind} onClick={() => setOverride({ ...override, kind })}>{label}</button>)}</div><Button type="submit" busy={mutation.isPending}>Save date override</Button></form>{overrides.length > 0 && <div className="schedule-record-list"><h3>Upcoming date overrides</h3>{overrides.map((item) => <div className="schedule-record" key={item.id}><span>{item.local_date} · {item.starts_local.slice(0, 5)}–{item.ends_local.slice(0, 5)} · {item.kind} · {item.approval_status}</span></div>)}</div>}</section>
    <GoogleMeetConnectionCard />
    <StatusMessage tone="info">Patient booking is generated from this schedule on the server. The 15-minute early join period and 15-minute note window do not consume additional schedule time.</StatusMessage>
  </section>;
}
