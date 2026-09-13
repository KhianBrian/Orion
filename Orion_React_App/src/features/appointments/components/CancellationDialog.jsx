import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { StatusMessage } from "../../../components/ui/StatusMessage";
import { cancellationReasons } from "../mutations";

const manilaDateTime = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export function CancellationDialog({ appointment, busy, error, denied, onClose, onConfirm, requiresReason = false, reasonCode: controlledReasonCode, explanation: controlledExplanation, onReasonCodeChange, onExplanationChange }) {
  const [internalReasonCode, setInternalReasonCode] = useState("");
  const [internalExplanation, setInternalExplanation] = useState("");
  const reasonCode = controlledReasonCode ?? internalReasonCode;
  const explanation = controlledExplanation ?? internalExplanation;
  const setReasonCode = onReasonCodeChange || setInternalReasonCode;
  const setExplanation = onExplanationChange || setInternalExplanation;
  const title = denied ? "Cancellation unavailable" : requiresReason ? "Record a cancellation" : "Cancel this appointment?";

  return <Dialog open={Boolean(appointment)} onClose={onClose} title={title} className={denied ? "ui-dialog--denial" : ""} actions={denied
    ? <Button variant="secondary" onClick={onClose}>Return to appointments</Button>
    : <><Button variant="secondary" onClick={onClose}>Keep appointment</Button><Button variant="danger" busy={busy}
      disabled={requiresReason && (!reasonCode || (reasonCode === "other_operational_reason" && !explanation.trim()))}
      onClick={() => onConfirm(requiresReason ? { reasonCode, explanation } : undefined)}>Cancel appointment</Button></>}>
    {denied ? <div className="cancellation-denial" role="alert"><span className="cancellation-denial__icon" aria-hidden="true">!</span><p>This appointment can no longer be cancelled under the cancellation policy.</p><p>{requiresReason ? "Psychiatrists may cancel only more than 48 hours before the scheduled start time. An administrator handles late cancellations." : "Appointments may be cancelled only more than 24 hours before their scheduled start time."}</p></div> : <>
      <p>Are you sure you want to cancel this appointment?</p>
      {appointment && <p><strong>{appointment.counterpart_display_name || "Assigned psychiatrist"}</strong><br />{manilaDateTime.format(new Date(appointment.starts_at))}</p>}
      {requiresReason && <div className="cancellation-form-fields">
        <label htmlFor="cancellationReason">Reason for cancellation</label>
        <select id="cancellationReason" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>
          <option value="" disabled>Select a reason</option>
          {cancellationReasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
        </select>
        <label htmlFor="cancellationExplanation">Additional operational explanation <span>(optional, 500 characters)</span></label>
        <textarea id="cancellationExplanation" maxLength={500} rows="3" value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="Required for Other approved operational reason." />
      </div>}
      {error && <StatusMessage tone="error">We could not complete the cancellation. Please try again.</StatusMessage>}
    </>}
  </Dialog>;
}
