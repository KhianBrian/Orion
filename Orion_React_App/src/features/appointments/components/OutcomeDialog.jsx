import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { StatusMessage } from "../../../components/ui/StatusMessage";

export function OutcomeDialog({ appointment, status, busy, error, onClose, onConfirm }) {
  const [absentParty, setAbsentParty] = useState("");
  const isNoShow = status === "no_show";
  return <Dialog open={Boolean(appointment)} onClose={onClose} title={isNoShow ? "Record a no-show" : "Mark appointment completed"}
    actions={<><Button variant="secondary" onClick={onClose}>Keep appointment</Button><Button busy={busy} disabled={isNoShow && !absentParty} onClick={() => onConfirm(absentParty || null)}>Save outcome</Button></>}>
    <p>{isNoShow ? "The no-show action is available only after the 15-minute grace period. Record who was absent." : "This is a manual clinical outcome. Orion never completes an appointment automatically."}</p>
    {isNoShow && <fieldset className="outcome-choice"><legend>Absent party</legend><label><input type="radio" name="absent-party" value="patient" checked={absentParty === "patient"} onChange={(event) => setAbsentParty(event.target.value)} /> Patient</label><label><input type="radio" name="absent-party" value="psychiatrist" checked={absentParty === "psychiatrist"} onChange={(event) => setAbsentParty(event.target.value)} /> Psychiatrist</label></fieldset>}
    {error && <StatusMessage tone="error">The outcome could not be saved. It may not yet be permitted by the clinical timing rule.</StatusMessage>}
  </Dialog>;
}
