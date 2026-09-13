import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button, ButtonLink } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../features/auth/authContext";
import { AppointmentList } from "../features/appointments/components/AppointmentList";
import { CancellationDialog } from "../features/appointments/components/CancellationDialog";
import { appointmentErrorCode, cancelAppointment, cancelPsychiatristAppointment, recordOutcome } from "../features/appointments/mutations";
import { appointmentQueryKey, fetchAppointments, fetchSessionNoteIndex, sessionNotesQueryKey } from "../features/appointments/queries";
import { useMeetingWindowClock } from "../lib/useMeetingWindowClock";
import { OutcomeDialog } from "../features/appointments/components/OutcomeDialog";
import { RescheduleRequests } from "../features/appointments/components/RescheduleRequests";
import { SessionNoteDialog } from "../features/appointments/components/SessionNoteDialog";
import "./PatientAppointment.css";

export default function Appointments() {
  const { profile } = useAuth();
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [cancellationRequestId, setCancellationRequestId] = useState(null);
  const [message, setMessage] = useState(null);
  const [cancellationError, setCancellationError] = useState(false);
  const [cancellationDenied, setCancellationDenied] = useState(false);
  const [cancellationReasonCode, setCancellationReasonCode] = useState("");
  const [cancellationExplanation, setCancellationExplanation] = useState("");
  const client = useQueryClient();
  const { data: appointments = [], error, isPending, refetch } = useQuery({
    queryKey: appointmentQueryKey(profile.id),
    queryFn: fetchAppointments,
  });
  const cancellation = useMutation({ mutationFn: cancelAppointment });
  const clinicianCancellation = useMutation({ mutationFn: cancelPsychiatristAppointment });
  const outcome = useMutation({ mutationFn: recordOutcome });
  const notes = useQuery({ queryKey: sessionNotesQueryKey(profile.id), queryFn: fetchSessionNoteIndex });
  const navigate = useNavigate();
  const now = useMeetingWindowClock(appointments);
  const isPatient = profile.role === "patient";

  const closeCancellation = () => {
    setSelectedAppointment(null);
    setCancellationRequestId(null);
    setCancellationError(false);
    setCancellationDenied(false);
    setCancellationReasonCode("");
    setCancellationExplanation("");
  };

  const selectAppointmentForCancellation = (appointment) => {
    setSelectedAppointment(appointment);
    setCancellationRequestId(crypto.randomUUID());
    setMessage(null);
    setCancellationError(false);
    setCancellationDenied(false);
    setCancellationReasonCode("");
    setCancellationExplanation("");
  };

  const confirmCancellation = async (reason) => {
    if (!selectedAppointment || !cancellationRequestId) return;

    setCancellationError(false);
    try {
      if (isPatient) await cancellation.mutateAsync({ appointmentId: selectedAppointment.id, idempotencyKey: cancellationRequestId });
      else await clinicianCancellation.mutateAsync({ appointmentId: selectedAppointment.id, idempotencyKey: cancellationRequestId, ...reason });
    } catch (mutationError) {
      if (await appointmentErrorCode(mutationError) === "cancellation_not_permitted") {
        setCancellationDenied(true);
      } else {
        setCancellationError(true);
      }
      return;
    }

    closeCancellation();
    setMessage({ kind: "success", text: isPatient ? "Your appointment has been cancelled." : "The appointment has been cancelled and its history was retained." });
    await client.invalidateQueries({ queryKey: appointmentQueryKey(profile.id) });
  };

  const confirmOutcome = async (absentParty) => {
    if (!selectedOutcome) return;
    try {
      await outcome.mutateAsync({ appointmentId: selectedOutcome.appointment.id, status: selectedOutcome.status, absentParty, idempotencyKey: crypto.randomUUID() });
      setSelectedOutcome(null);
      setMessage({ kind: "success", text: selectedOutcome.status === "no_show" ? "The no-show was recorded." : "The appointment was marked completed." });
      await client.invalidateQueries({ queryKey: appointmentQueryKey(profile.id) });
    } catch (error) {
      setMessage({ kind: "error", text: (await appointmentErrorCode(error)) === "outcome_not_permitted" ? "This outcome is not yet permitted by the appointment policy." : "We could not save the appointment outcome." });
    }
  };

  const noteIds = new Set((notes.data || []).map((note) => note.appointment_id));

  return <section className="scheduling-page">
    <div className="scheduling-header"><div><h1>{isPatient ? "My appointments" : "Assigned appointments"}</h1><p>Times are shown in Manila time. Appointment access is determined by server-side policy.</p></div>{isPatient && <ButtonLink to="/patient-appointment">Book an appointment</ButtonLink>}</div>
    {!isPatient && <RescheduleRequests profile={profile} />}
    {isPending && <StatusMessage>Loading appointments…</StatusMessage>}
    {error && <StatusMessage tone="error">Appointments could not be loaded. <Button variant="quiet" onClick={() => refetch()}>Try again</Button></StatusMessage>}
    {!isPending && !error && !appointments.length && <StatusMessage>No appointments are scheduled.</StatusMessage>}
    {message && <StatusMessage tone={message.kind === "success" ? "success" : "error"}>{message.text}</StatusMessage>}
    {!isPending && !error && appointments.length > 0 && <AppointmentList appointments={appointments} isPatient={isPatient} now={now} noteIds={noteIds} onCancel={selectAppointmentForCancellation} onReschedule={(appointment) => navigate(`/patient-appointment?reschedule=${appointment.id}`)} onClinicianCancel={selectAppointmentForCancellation} onOutcome={(appointment, status) => setSelectedOutcome({ appointment, status })} onNote={setSelectedNote} />}
    <CancellationDialog appointment={selectedAppointment} busy={cancellation.isPending || clinicianCancellation.isPending} error={cancellationError} denied={cancellationDenied} onClose={closeCancellation} onConfirm={confirmCancellation} requiresReason={!isPatient} reasonCode={cancellationReasonCode} explanation={cancellationExplanation} onReasonCodeChange={setCancellationReasonCode} onExplanationChange={setCancellationExplanation} />
    <OutcomeDialog appointment={selectedOutcome?.appointment} status={selectedOutcome?.status} busy={outcome.isPending} error={Boolean(outcome.error)} onClose={() => setSelectedOutcome(null)} onConfirm={confirmOutcome} />
    <SessionNoteDialog appointment={selectedNote} note={(notes.data || []).find((item) => item.appointment_id === selectedNote?.id)} isPatient={isPatient} accountId={profile.id} onClose={() => setSelectedNote(null)} />
  </section>;
}
