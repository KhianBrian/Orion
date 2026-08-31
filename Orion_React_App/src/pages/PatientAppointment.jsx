import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./PatientAppointment.css";

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
  const [slots, setSlots] = useState([]);
  const [state, setState] = useState("loading");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState(null);

  const loadSlots = useCallback(async () => {
    setState("loading");
    const { data, error } = await supabase
      .from("availability_slots")
      .select("id, starts_at, ends_at, psychiatrist:psychiatrists!availability_slots_psychiatrist_id_fkey(display_name)")
      .eq("status", "open")
      .order("starts_at", { ascending: true });
    if (error) return setState("error");
    setSlots(data || []);
    setState(data?.length ? "ready" : "empty");
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(loadSlots);
    return () => cancelAnimationFrame(frame);
  }, [loadSlots]);

  const selectSlot = (slot) => {
    setSelectedSlot(slot);
    setRequestId(crypto.randomUUID());
    setMessage(null);
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !requestId) return;
    setBooking(true);
    setMessage(null);
    const { error } = await supabase.functions.invoke("book-appointment", {
      body: { slotId: selectedSlot.id, idempotencyKey: requestId },
    });
    if (error) {
      if (await errorCode(error) === "slot_unavailable") {
        setMessage({ kind: "conflict", text: "This slot is no longer available. Please choose another time." });
        setSelectedSlot(null);
        setRequestId(null);
        await loadSlots();
      } else {
        setMessage({ kind: "error", text: "We could not complete the booking. Please try again." });
      }
      setBooking(false);
      return;
    }
    setMessage({ kind: "success", text: "Your synthetic demo appointment is booked." });
    setSelectedSlot(null);
    setRequestId(null);
    setBooking(false);
    await loadSlots();
  };

  return <main className="scheduling-page">
    <div className="scheduling-header"><div><p className="eyebrow">Synthetic demo</p><h1>Book an appointment</h1><p>All times are shown in Manila time. Each session is 45 minutes.</p></div><Link className="secondary-action-button" to="/appointments">My appointments</Link></div>
    {message && <p role="status" className={`schedule-message ${message.kind}`}>{message.text}</p>}
    {state === "loading" && <p role="status">Loading available psychiatrists and appointment slots…</p>}
    {state === "error" && <div className="schedule-message error"><p>Available slots could not be loaded.</p><button onClick={loadSlots}>Try again</button></div>}
    {state === "empty" && <p role="status">There are no open appointment slots at this time.</p>}
    {state === "ready" && <section className="slot-list" aria-label="Open appointment slots">{slots.map((slot) => <article className="slot-card" key={slot.id}><h2>{psychiatristName(slot)}</h2><p>{manilaDateTime.format(new Date(slot.starts_at))}</p><p className="slot-duration">45 minutes</p><button onClick={() => selectSlot(slot)}>Choose this slot</button></article>)}</section>}
    {selectedSlot && <section className="booking-confirmation" aria-labelledby="confirm-booking-title"><h2 id="confirm-booking-title">Confirm your appointment</h2><p>{psychiatristName(selectedSlot)} — {manilaDateTime.format(new Date(selectedSlot.starts_at))} (45 minutes)</p><div className="booking-actions"><button onClick={confirmBooking} disabled={booking}>{booking ? "Booking…" : "Confirm booking"}</button><button className="secondary-action-button" onClick={() => { setSelectedSlot(null); setRequestId(null); }}>Choose another slot</button></div></section>}
  </main>;
}
