import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { CancellationDialog } from "../features/appointments/components/CancellationDialog";
import { cancellationReasons, cancelAdminAppointment, appointmentErrorCode, correctOutcome, saveBookingControl } from "../features/appointments/mutations";
import { appointmentQueryKey, fetchAdminAppointments } from "../features/appointments/queries";
import { Dialog } from "../components/ui/Dialog";
import { useAuth } from "../features/auth/authContext";
import { supabase } from "../lib/supabase";

const manilaDateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

export default function AdminAppointments() {
  const { profile } = useAuth();
  const client = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [correction, setCorrection] = useState(null);
  const [message, setMessage] = useState(null);
  const query = useQuery({ queryKey: appointmentQueryKey(profile.id), queryFn: fetchAdminAppointments });
  const switchQuery = useQuery({ queryKey: ["booking-control"], queryFn: async () => { const { data, error } = await supabase.rpc("get_booking_status"); if (error) throw error; return data; } });
  const cancel = useMutation({ mutationFn: cancelAdminAppointment });
  const correct = useMutation({ mutationFn: correctOutcome });
  const switchMutation = useMutation({ mutationFn: saveBookingControl });
  const confirmCancellation = async ({ reasonCode, explanation }) => {
    try {
      await cancel.mutateAsync({ appointmentId: selected.id, idempotencyKey: crypto.randomUUID(), reasonCode, explanation });
      setSelected(null);
      setMessage("The administrative cancellation was recorded.");
      await client.invalidateQueries({ queryKey: appointmentQueryKey(profile.id) });
    } catch (error) {
      if (await appointmentErrorCode(error) === "cancellation_not_permitted") setMessage("This appointment is not eligible for the administrative late-cancellation path.");
    }
  };
  const confirmCorrection = async () => {
    try {
      await correct.mutateAsync({ appointmentId: correction.appointment.id, status: correction.status, absentParty: correction.status === "no_show" ? correction.absentParty : null, idempotencyKey: crypto.randomUUID() });
      setCorrection(null);
      await client.invalidateQueries({ queryKey: appointmentQueryKey(profile.id) });
    } catch {
      setMessage("The outcome correction could not be saved.");
    }
  };
  const toggleBooking = async () => { await switchMutation.mutateAsync({ enabled: !switchQuery.data, idempotencyKey: crypto.randomUUID() }); await client.invalidateQueries({ queryKey: ["booking-control"] }); setMessage(!switchQuery.data ? "Booking is enabled." : "Booking is disabled."); };
  return <section className="scheduling-page"><div className="scheduling-header"><div><p className="eyebrow">Administrator access</p><h1>Appointment operations</h1><p>Minimum operational fields only. Clinical notes and unrestricted profile data are not shown.</p></div></div><div className="booking-control"><h2>Booking availability</h2><p>{switchQuery.isPending ? "Checking server control…" : switchQuery.data ? "Patient booking is enabled." : "Patient booking is disabled."}</p><Button variant={switchQuery.data ? "danger" : "primary"} busy={switchMutation.isPending} onClick={toggleBooking}>{switchQuery.data ? "Disable booking" : "Enable booking"}</Button></div>{message && <StatusMessage tone="info">{message}</StatusMessage>}{query.isPending && <StatusMessage>Loading appointment operations…</StatusMessage>}{query.error && <StatusMessage tone="error">Appointment operations could not be loaded.</StatusMessage>}{!query.isPending && !query.error && <div className="admin-appointment-list">{(query.data || []).map((appointment) => <article className="appointment-card" key={appointment.id}><div className="appointment-card__heading"><h2>{appointment.patient_display_name}</h2><span className="appointment-status">{appointment.status}</span></div><p>{appointment.psychiatrist_display_name}</p><p>{manilaDateTime.format(new Date(appointment.starts_at))} · 45 minutes</p>{appointment.cancellation_reason_code && <p>Cancellation reason: {cancellationReasons.find((item) => item.value === appointment.cancellation_reason_code)?.label || appointment.cancellation_reason_code}</p>}<div className="appointment-card__actions">{appointment.status === "booked" && <Button variant="danger" onClick={() => setSelected(appointment)}>Late-cancel for psychiatrist</Button>}{["completed", "no_show"].includes(appointment.status) && <Button variant="secondary" onClick={() => setCorrection({ appointment, status: appointment.status === "completed" ? "no_show" : "completed", absentParty: "patient" })}>Correct outcome</Button>}</div></article>)}</div>}
    <CancellationDialog key={selected?.id || "admin-cancellation-closed"} appointment={selected} busy={cancel.isPending} error={false} denied={false} onClose={() => setSelected(null)} onConfirm={confirmCancellation} requiresReason />
    <Dialog open={Boolean(correction)} onClose={() => setCorrection(null)} title="Correct appointment outcome" actions={<><Button variant="secondary" onClick={() => setCorrection(null)}>Keep outcome</Button><Button busy={correct.isPending} onClick={confirmCorrection}>Save correction</Button></>}><p>The original outcome remains in the audit history. This administrative correction changes only the current operational status.</p><p>New status: {correction?.status === "no_show" ? "No show" : "Completed"}</p></Dialog>
  </section>;
}
