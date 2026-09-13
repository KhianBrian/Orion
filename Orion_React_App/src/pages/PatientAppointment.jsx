import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  appointmentQueryKey,
  fetchActivePsychiatrists,
  fetchPatientAvailability,
  patientAvailabilityQueryKey,
  psychiatristsQueryKey,
} from "../features/appointments/queries";
import { useAuth } from "../features/auth/authContext";
import { supabase } from "../lib/supabase";
import "./PatientAppointment.css";
import { Button, ButtonLink } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { StatusMessage } from "../components/ui/StatusMessage";
import { appointmentErrorCode, requestReschedule } from "../features/appointments/mutations";

const manilaTimeZone = "Asia/Manila";
const manilaTime = new Intl.DateTimeFormat("en-PH", { timeStyle: "short", timeZone: manilaTimeZone });
const manilaDateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeStyle: "short", timeZone: manilaTimeZone });
const manilaDateLabel = new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: manilaTimeZone });

function manilaDateForOffset(offset) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: manilaTimeZone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return new Date(Date.UTC(values.year, values.month - 1, values.day + offset)).toISOString().slice(0, 10);
}

function dateAtNoon(date) {
  return new Date(`${date}T12:00:00+08:00`);
}

function psychiatristName(slot) {
  const psychiatrist = Array.isArray(slot.psychiatrist) ? slot.psychiatrist[0] : slot.psychiatrist;
  return psychiatrist?.display_name || "Psychiatrist";
}

async function errorCode(error) {
  if (error?.context instanceof Response) return (await error.context.json()).error;
  return undefined;
}

export default function PatientAppointment() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const rescheduleAppointmentId = searchParams.get("reschedule");
  const [selectedPsychiatrist, setSelectedPsychiatrist] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [message, setMessage] = useState(null);
  const [bookingConfirmation, setBookingConfirmation] = useState(null);
  const client = useQueryClient();
  const psychiatrists = useQuery({ queryKey: psychiatristsQueryKey, queryFn: fetchActivePsychiatrists });
  const availability = useQuery({
    queryKey: patientAvailabilityQueryKey(selectedPsychiatrist?.id, selectedDate),
    queryFn: fetchPatientAvailability,
    enabled: Boolean(selectedPsychiatrist && selectedDate),
  });
  const bookingMutation = useMutation({
    mutationFn: ({ slotId, idempotencyKey }) => supabase.functions.invoke("book-appointment", { body: { slotId, idempotencyKey } }),
  });
  const rescheduleMutation = useMutation({ mutationFn: requestReschedule });
  const dates = useMemo(() => Array.from({ length: 15 }, (_, offset) => manilaDateForOffset(offset)), []);

  const choosePsychiatrist = (psychiatrist) => {
    setSelectedPsychiatrist(psychiatrist);
    setSelectedDate(null);
    setSelectedSlot(null);
    setRequestId(null);
    setMessage(null);
  };

  const chooseDate = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setRequestId(null);
    setMessage(null);
  };

  const selectSlot = (slot) => {
    setSelectedSlot({ ...slot, id: slot.slot_id, psychiatrist: { display_name: selectedPsychiatrist.display_name } });
    setRequestId(crypto.randomUUID());
    setMessage(null);
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !requestId) return;
    setMessage(null);
    try {
      const { error: mutationError } = await bookingMutation.mutateAsync({ slotId: selectedSlot.id, idempotencyKey: requestId });
      if (mutationError) throw mutationError;
    } catch (mutationError) {
      const code = await errorCode(mutationError);
      if (code === "slot_unavailable") {
        setMessage({ kind: "conflict", text: "This slot is no longer available. Please choose another time." });
        setSelectedSlot(null);
        setRequestId(null);
        await client.invalidateQueries({ queryKey: patientAvailabilityQueryKey(selectedPsychiatrist.id, selectedDate) });
      } else if (code === "email_not_confirmed") {
        setMessage({ kind: "error", text: "Please confirm your email address before booking an appointment." });
      } else if (code === "booking_disabled") {
        setMessage({ kind: "error", text: "Online booking is temporarily unavailable. Please try again later." });
      } else {
        setMessage({ kind: "error", text: "We could not complete the booking. Please try again." });
      }
      return;
    }

    if (rescheduleAppointmentId) {
      try {
        await rescheduleMutation.mutateAsync({ appointmentId: rescheduleAppointmentId, slotId: selectedSlot.id, idempotencyKey: requestId });
      } catch (mutationError) {
        const code = await appointmentErrorCode(mutationError);
        setMessage({ kind: "error", text: code === "slot_unavailable" ? "That time was just taken. Please choose another time." : "We could not request this change. Please try again." });
        setSelectedSlot(null);
        setRequestId(null);
        await client.invalidateQueries({ queryKey: patientAvailabilityQueryKey(selectedPsychiatrist.id, selectedDate) });
        return;
      }
      setMessage({ kind: "success", text: "Your reschedule request was sent to the assigned psychiatrist for approval." });
      setSelectedSlot(null);
      setRequestId(null);
      await client.invalidateQueries({ queryKey: appointmentQueryKey(profile.id) });
      return;
    }

    setBookingConfirmation(selectedSlot);
    setMessage(null);
    setSelectedSlot(null);
    setRequestId(null);
    await Promise.all([
      client.invalidateQueries({ queryKey: patientAvailabilityQueryKey(selectedPsychiatrist.id, selectedDate) }),
      client.invalidateQueries({ queryKey: appointmentQueryKey(profile.id) }),
    ]);
  };

  return <section className="scheduling-page">
    <div className="scheduling-header"><div><h1>{rescheduleAppointmentId ? "Request a new appointment time" : "Book an appointment"}</h1><p>Choose a psychiatrist, then a Manila date, then an available 45-minute time.</p></div><ButtonLink variant="secondary" to="/appointments">My appointments</ButtonLink></div>
    {rescheduleAppointmentId && <StatusMessage>Choose an open time with the same psychiatrist. Your current appointment remains booked until the psychiatrist approves this request.</StatusMessage>}
    {bookingConfirmation && <section className="booking-success" aria-labelledby="booking-success-title"><span className="booking-success__mark" aria-hidden="true">✓</span><div><p className="booking-success__eyebrow">Appointment confirmed</p><h2 id="booking-success-title">You’re all set.</h2><p>Your appointment with <strong>{psychiatristName(bookingConfirmation)}</strong> is reserved for {manilaDateTime.format(new Date(bookingConfirmation.starts_at))}.</p></div><ButtonLink to="/appointments">View my appointments</ButtonLink></section>}
    {message && <StatusMessage tone={message.kind === "success" ? "success" : "error"}>{message.text}</StatusMessage>}
    {psychiatrists.isPending && <StatusMessage>Loading available psychiatrists…</StatusMessage>}
    {psychiatrists.error && <StatusMessage tone="error">Available psychiatrists could not be loaded. <Button variant="quiet" onClick={() => psychiatrists.refetch()}>Try again</Button></StatusMessage>}
    {!psychiatrists.isPending && !psychiatrists.error && <>
      <section className="booking-step" aria-labelledby="choose-psychiatrist-title"><div className="booking-step__heading"><span className="booking-step__number">1</span><div><h2 id="choose-psychiatrist-title">Choose a psychiatrist</h2><p>Appointments are scheduled with the clinician you select.</p></div></div><div className="choice-grid">{psychiatrists.data.map((psychiatrist) => <button className={`choice-card ${selectedPsychiatrist?.id === psychiatrist.id ? "choice-card--selected" : ""}`} type="button" aria-pressed={selectedPsychiatrist?.id === psychiatrist.id} key={psychiatrist.id} onClick={() => choosePsychiatrist(psychiatrist)}><strong>{psychiatrist.display_name}</strong><span>View available times</span></button>)}</div>{!psychiatrists.data.length && <StatusMessage>There are no active psychiatrists available for booking.</StatusMessage>}</section>
      {selectedPsychiatrist && <section className="booking-step" aria-labelledby="choose-date-title"><div className="booking-step__heading"><span className="booking-step__number">2</span><div><h2 id="choose-date-title">Choose a date</h2><p>Book up to two weeks ahead. Times are in Asia/Manila.</p></div></div><div className="date-grid">{dates.map((date) => <button className={`date-card ${selectedDate === date ? "date-card--selected" : ""}`} type="button" aria-pressed={selectedDate === date} aria-label={`Choose ${manilaDateLabel.format(dateAtNoon(date))}`} key={date} onClick={() => chooseDate(date)}>{manilaDateLabel.format(dateAtNoon(date))}</button>)}</div></section>}
      {selectedPsychiatrist && selectedDate && <section className="booking-step" aria-labelledby="choose-time-title"><div className="booking-step__heading"><span className="booking-step__number">3</span><div><h2 id="choose-time-title">Choose an available time</h2><p>{selectedPsychiatrist.display_name} · {manilaDateLabel.format(dateAtNoon(selectedDate))} · 45 minutes</p></div></div>{availability.isPending && <StatusMessage>Checking server-confirmed availability…</StatusMessage>}{availability.error && <StatusMessage tone="error">Available times could not be loaded. <Button variant="quiet" onClick={() => availability.refetch()}>Try again</Button></StatusMessage>}{!availability.isPending && !availability.error && !availability.data?.length && <StatusMessage>There are no available times for this date. Choose another date.</StatusMessage>}{!availability.isPending && !availability.error && availability.data?.length > 0 && <div className="slot-list" aria-label="Open appointment slots">{availability.data.map((slot) => <article className="slot-card" key={slot.slot_id}><h3>{manilaTime.format(new Date(slot.starts_at))}</h3><p>{selectedPsychiatrist.display_name}</p><p className="slot-duration">45-minute clinical session</p><Button onClick={() => selectSlot(slot)}>Choose this time</Button></article>)}</div>}</section>}
    </>}
    <Dialog open={Boolean(selectedSlot)} onClose={() => { setSelectedSlot(null); setRequestId(null); }} title={rescheduleAppointmentId ? "Request this new time?" : "Confirm your appointment"} actions={<><Button variant="secondary" onClick={() => { setSelectedSlot(null); setRequestId(null); }}>Choose another time</Button><Button busy={bookingMutation.isPending || rescheduleMutation.isPending} onClick={confirmBooking}>{rescheduleAppointmentId ? "Request reschedule" : "Confirm booking"}</Button></>}><p>{selectedSlot && `${psychiatristName(selectedSlot)} — ${manilaDateTime.format(new Date(selectedSlot.starts_at))} (45 minutes)`}</p></Dialog>
  </section>;
}
