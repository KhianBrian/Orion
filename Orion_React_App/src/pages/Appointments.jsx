import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, ButtonLink } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../features/auth/authContext";
import { AppointmentList } from "../features/appointments/components/AppointmentList";
import { CancellationDialog } from "../features/appointments/components/CancellationDialog";
import { appointmentErrorCode, cancelAppointment } from "../features/appointments/mutations";
import { appointmentQueryKey, fetchAppointments } from "../features/appointments/queries";
import { useMeetingWindowClock } from "../lib/useMeetingWindowClock";
import "./PatientAppointment.css";

export default function Appointments() {
  const { profile } = useAuth();
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancellationRequestId, setCancellationRequestId] = useState(null);
  const [message, setMessage] = useState(null);
  const [cancellationError, setCancellationError] = useState(false);
  const [cancellationDenied, setCancellationDenied] = useState(false);
  const client = useQueryClient();
  const { data: appointments = [], error, isPending, refetch } = useQuery({
    queryKey: appointmentQueryKey(profile.id),
    queryFn: fetchAppointments,
  });
  const cancellation = useMutation({ mutationFn: cancelAppointment });
  const now = useMeetingWindowClock(appointments);
  const isPatient = profile.role === "patient";

  const closeCancellation = () => {
    setSelectedAppointment(null);
    setCancellationRequestId(null);
    setCancellationError(false);
    setCancellationDenied(false);
  };

  const selectAppointmentForCancellation = (appointment) => {
    setSelectedAppointment(appointment);
    setCancellationRequestId(crypto.randomUUID());
    setMessage(null);
    setCancellationError(false);
    setCancellationDenied(false);
  };

  const confirmCancellation = async () => {
    if (!selectedAppointment || !cancellationRequestId) return;

    setCancellationError(false);
    try {
      await cancellation.mutateAsync({
        appointmentId: selectedAppointment.id,
        idempotencyKey: cancellationRequestId,
      });
    } catch (mutationError) {
      if (await appointmentErrorCode(mutationError) === "cancellation_not_permitted") {
        setCancellationDenied(true);
      } else {
        setCancellationError(true);
      }
      return;
    }

    closeCancellation();
    setMessage({ kind: "success", text: "Your appointment has been cancelled." });
    await client.invalidateQueries({ queryKey: appointmentQueryKey(profile.id) });
  };

  return <section className="scheduling-page">
    <div className="scheduling-header"><div><h1>{isPatient ? "My appointments" : "Assigned appointments"}</h1><p>Times are shown in Manila time. Appointment access is determined by server-side policy.</p></div>{isPatient && <ButtonLink to="/patient-appointment">Book an appointment</ButtonLink>}</div>
    {isPending && <StatusMessage>Loading appointments…</StatusMessage>}
    {error && <StatusMessage tone="error">Appointments could not be loaded. <Button variant="quiet" onClick={() => refetch()}>Try again</Button></StatusMessage>}
    {!isPending && !error && !appointments.length && <StatusMessage>No appointments are scheduled.</StatusMessage>}
    {message && <StatusMessage tone={message.kind === "success" ? "success" : "error"}>{message.text}</StatusMessage>}
    {!isPending && !error && appointments.length > 0 && <AppointmentList appointments={appointments} isPatient={isPatient} now={now} onCancel={selectAppointmentForCancellation} />}
    <CancellationDialog appointment={selectedAppointment} busy={cancellation.isPending} error={cancellationError} denied={cancellationDenied} onClose={closeCancellation} onConfirm={confirmCancellation} />
  </section>;
}
