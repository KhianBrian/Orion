import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { appointmentQueryKey, fetchOpenAvailability, openAvailabilityQueryKey } from "../features/appointments/queries";
import { useAuth } from "../features/auth/authContext";
import { supabase } from "../lib/supabase";
import "./PatientAppointment.css";
import { Button, ButtonLink } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { StatusMessage } from "../components/ui/StatusMessage";
import { appointmentErrorCode, requestReschedule } from "../features/appointments/mutations";

const manilaDateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Manila" });

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
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [message, setMessage] = useState(null);
  const [bookingConfirmation, setBookingConfirmation] = useState(null);
  const client = useQueryClient();
  const { data: slots = [], error, isPending, refetch } = useQuery({
    queryKey: openAvailabilityQueryKey,
    queryFn: fetchOpenAvailability,
  });
  const bookingMutation = useMutation({
    mutationFn: ({ slotId, idempotencyKey }) => supabase.functions.invoke("book-appointment", {
      body: { slotId, idempotencyKey },
    }),
  });
  const rescheduleMutation = useMutation({ mutationFn: requestReschedule });

  const selectSlot = (slot) => {
    setSelectedSlot(slot);
    setRequestId(crypto.randomUUID());
    setMessage(null);
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !requestId) return;
    setMessage(null);
    try {
      const { error: mutationError } = await bookingMutation.mutateAsync({
        slotId: selectedSlot.id,
        idempotencyKey: requestId,
      });
      if (mutationError) throw mutationError;
    } catch (mutationError) {
      const code = await errorCode(mutationError);
      if (code === "slot_unavailable") {
        setMessage({ kind: "conflict", text: "This slot is no longer available. Please choose another time." });
        setSelectedSlot(null);
        setRequestId(null);
        await client.invalidateQueries({ queryKey: openAvailabilityQueryKey });
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
        await client.invalidateQueries({ queryKey: openAvailabilityQueryKey });
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
      client.invalidateQueries({ queryKey: openAvailabilityQueryKey }),
      client.invalidateQueries({ queryKey: appointmentQueryKey(profile.id) }),
    ]);
  };

  return <section className="scheduling-page">
    <div className="scheduling-header"><div><h1>{rescheduleAppointmentId ? "Request a new appointment time" : "Book an appointment"}</h1><p>All times are shown in Manila time. Each session is 45 minutes.</p></div><ButtonLink variant="secondary" to="/appointments">My appointments</ButtonLink></div>
    {rescheduleAppointmentId && <StatusMessage>Choose an open time with the same psychiatrist. Your current appointment remains booked until the psychiatrist approves this request.</StatusMessage>}
    {bookingConfirmation && <section className="booking-success" aria-labelledby="booking-success-title"><span className="booking-success__mark" aria-hidden="true">✓</span><div><p className="booking-success__eyebrow">Appointment confirmed</p><h2 id="booking-success-title">You’re all set.</h2><p>Your appointment with <strong>{psychiatristName(bookingConfirmation)}</strong> is reserved for {manilaDateTime.format(new Date(bookingConfirmation.starts_at))}.</p></div><ButtonLink to="/appointments">View my appointments</ButtonLink></section>}
    {message && <StatusMessage tone={message.kind === "success" ? "success" : "error"}>{message.text}</StatusMessage>}
    {isPending && <StatusMessage>Loading available psychiatrists and appointment slots…</StatusMessage>}
    {error && <StatusMessage tone="error">Available slots could not be loaded. <Button variant="quiet" onClick={() => refetch()}>Try again</Button></StatusMessage>}
    {!isPending && !error && !slots.length && <StatusMessage>There are no open appointment slots at this time.</StatusMessage>}
    {!isPending && !error && slots.length > 0 && <section className="slot-list" aria-label="Open appointment slots">{slots.map((slot) => <article className="slot-card" key={slot.id}><h2>{psychiatristName(slot)}</h2><p>{manilaDateTime.format(new Date(slot.starts_at))}</p><p className="slot-duration">45 minutes</p><Button onClick={() => selectSlot(slot)}>Choose this slot</Button></article>)}</section>}
    <Dialog open={Boolean(selectedSlot)} onClose={() => { setSelectedSlot(null); setRequestId(null); }} title={rescheduleAppointmentId ? "Request this new time?" : "Confirm your appointment"} actions={<><Button variant="secondary" onClick={() => { setSelectedSlot(null); setRequestId(null); }}>Choose another slot</Button><Button busy={bookingMutation.isPending || rescheduleMutation.isPending} onClick={confirmBooking}>{rescheduleAppointmentId ? "Request reschedule" : "Confirm booking"}</Button></>}><p>{selectedSlot && `${psychiatristName(selectedSlot)} — ${manilaDateTime.format(new Date(selectedSlot.starts_at))} (45 minutes)`}</p></Dialog>
  </section>;
}
