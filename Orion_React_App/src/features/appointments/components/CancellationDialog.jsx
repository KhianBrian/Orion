import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";

const manilaDateTime = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export function CancellationDialog({ appointment, busy, error, denied, onClose, onConfirm }) {
  const title = denied ? "Cancellation unavailable" : "Cancel this appointment?";

  return <Dialog open={Boolean(appointment)} onClose={onClose} title={title} className={denied ? "ui-dialog--denial" : ""} actions={denied
    ? <Button variant="secondary" onClick={onClose}>Return to appointments</Button>
    : <><Button variant="secondary" onClick={onClose}>Keep appointment</Button><Button variant="danger" busy={busy} onClick={onConfirm}>Cancel appointment</Button></>}>
    {denied ? <div className="cancellation-denial" role="alert"><span className="cancellation-denial__icon" aria-hidden="true">!</span><p>This appointment can no longer be cancelled under the cancellation policy.</p><p>Appointments may be cancelled only more than 24 hours before their scheduled start time.</p></div> : <>
      <p>Are you sure you want to cancel this appointment?</p>
      {appointment && <p><strong>{appointment.counterpart_display_name || "Assigned psychiatrist"}</strong><br />{manilaDateTime.format(new Date(appointment.starts_at))}</p>}
      {error && <StatusMessage tone="error">We could not complete the cancellation. Please try again.</StatusMessage>}
    </>}
  </Dialog>;
}
