import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, ButtonLink } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { appointmentErrorCode, manageSchedule } from "../features/appointments/mutations";
import { GoogleMeetConnectionCard } from "../features/appointments/components/GoogleMeetConnectionCard";
import { useAuth } from "../features/auth/authContext";
import "./PatientAppointment.css";

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const manilaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });

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
  const [rule, setRule] = useState({ weekday: "1", startsLocal: "08:00", endsLocal: "17:00" });
  const [editingRuleId, setEditingRuleId] = useState(null);
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
      if (action === "save-rule") setEditingRuleId(null);
      await client.invalidateQueries({ queryKey: ["schedule", profile.id] });
    } catch (error) {
      setMessage({ tone: "error", text: await friendlyError(error) });
    }
  };
  const deleteRule = async (id) => save("delete-rule", { ruleId: id }, "The recurring schedule period was removed.");
  const rules = (query.data || []).filter((item) => item.record_type === "rule");
  const overrides = (query.data || []).filter((item) => item.record_type === "override");
  const editRule = (item) => {
    setEditingRuleId(item.id);
    setRule({ weekday: String(item.weekday), startsLocal: item.starts_local.slice(0, 5), endsLocal: item.ends_local.slice(0, 5) });
    setMessage(null);
  };
  const cancelRuleEdit = () => {
    setEditingRuleId(null);
    setRule({ weekday: "1", startsLocal: "08:00", endsLocal: "17:00" });
  };
  const saveRule = (event) => {
    event.preventDefault();
    const weekday = Number(rule.weekday);
    const matchingRule = rules.find((item) => item.weekday === weekday
      && item.starts_local.slice(0, 5) === rule.startsLocal
      && item.ends_local.slice(0, 5) === rule.endsLocal);
    save("save-rule", {
      ruleId: editingRuleId || matchingRule?.id || null,
      weekday,
      startsLocal: rule.startsLocal,
      endsLocal: rule.endsLocal,
    }, "The recurring schedule period was saved.");
  };

  return <section className="scheduling-page">
    <div className="scheduling-header"><div><p className="eyebrow">Clinician schedule</p><h1>My availability</h1><p>Manage recurring weekday periods inside 8:00 AM–5:00 PM Asia/Manila. Booked appointments are never moved automatically.</p></div><ButtonLink variant="secondary" to="/appointments">My appointments</ButtonLink></div>
    {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}
    {query.isPending && <StatusMessage>Loading your schedule…</StatusMessage>}
    {query.error && <StatusMessage tone="error">Your schedule could not be loaded. Try refreshing the page.</StatusMessage>}
    <GoogleMeetConnectionCard />
    <section className="schedule-editor" aria-labelledby="recurring-schedule-title"><div className="booking-step__heading"><span className="booking-step__number">1</span><div><h2 id="recurring-schedule-title">Recurring weekday period</h2><p>Changes apply only to future unbooked availability.</p></div></div><form className="schedule-form" onSubmit={saveRule}><label>Weekday<select value={rule.weekday} onChange={(event) => setRule({ ...rule, weekday: event.target.value })}>{dayNames.map((day, index) => <option value={index + 1} key={day}>{day}</option>)}</select></label><label>Starts<input type="time" step="900" min="08:00" max="16:15" value={rule.startsLocal} onChange={(event) => setRule({ ...rule, startsLocal: event.target.value })} /></label><label>Ends<input type="time" step="900" min="08:45" max="17:00" value={rule.endsLocal} onChange={(event) => setRule({ ...rule, endsLocal: event.target.value })} /></label><Button type="submit" busy={mutation.isPending}>{editingRuleId ? "Update recurring period" : "Save recurring period"}</Button>{editingRuleId && <Button type="button" variant="quiet" onClick={cancelRuleEdit}>Cancel edit</Button>}</form>{rules.length > 0 && <div className="schedule-record-list"><h3>Current recurring periods</h3>{rules.map((item) => <div className="schedule-record" key={item.id}><span>{dayNames[item.weekday - 1]} · {item.starts_local.slice(0, 5)}–{item.ends_local.slice(0, 5)}</span><span><Button variant="quiet" onClick={() => editRule(item)}>Edit</Button><Button variant="quiet" onClick={() => deleteRule(item.id)}>Remove</Button></span></div>)}</div>}</section>
    <section className="schedule-editor" aria-labelledby="schedule-override-title"><div className="booking-step__heading"><span className="booking-step__number">2</span><div><h2 id="schedule-override-title">One-off date override</h2><p>Unavailable periods take precedence. Extra availability outside normal hours waits for admin approval.</p></div></div><form className="schedule-form" onSubmit={(event) => { event.preventDefault(); save("save-override", override, override.kind === "available" && (override.startsLocal < "08:00" || override.endsLocal > "17:00") ? "The outside-hours availability request was sent for admin approval." : "The date override was saved."); }}><label>Date<input type="date" min={manilaDate.format(new Date())} value={override.date} onChange={(event) => setOverride({ ...override, date: event.target.value })} /></label><label>Starts<input type="time" step="900" value={override.startsLocal} onChange={(event) => setOverride({ ...override, startsLocal: event.target.value })} /></label><label>Ends<input type="time" step="900" value={override.endsLocal} onChange={(event) => setOverride({ ...override, endsLocal: event.target.value })} /></label><label>Type<select value={override.kind} onChange={(event) => setOverride({ ...override, kind: event.target.value })}><option value="unavailable">Unavailable</option><option value="available">Available</option></select></label><Button type="submit" busy={mutation.isPending}>Save date override</Button></form>{overrides.length > 0 && <div className="schedule-record-list"><h3>Upcoming date overrides</h3>{overrides.map((item) => <div className="schedule-record" key={item.id}><span>{item.local_date} · {item.starts_local.slice(0, 5)}–{item.ends_local.slice(0, 5)} · {item.kind} · {item.approval_status}</span></div>)}</div>}</section>
    <StatusMessage tone="info">Patient booking is generated from this schedule on the server. The 15-minute early join period and 15-minute note window do not consume additional schedule time.</StatusMessage>
  </section>;
}
