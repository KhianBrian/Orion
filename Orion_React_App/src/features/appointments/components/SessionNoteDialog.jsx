import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { StatusMessage } from "../../../components/ui/StatusMessage";
import { readSessionNote, releaseSessionNote, saveSessionNote } from "../mutations";
import { sessionNotesQueryKey } from "../queries";

export function SessionNoteDialog({ appointment, note, isPatient, accountId, onClose }) {
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const noteQuery = useQuery({ queryKey: ["session-note", note?.id], queryFn: () => readSessionNote(note.id), enabled: Boolean(note?.id) });
  const save = useMutation({ mutationFn: saveSessionNote });
  const release = useMutation({ mutationFn: releaseSessionNote });
  const loadedNote = noteQuery.data?.note;

  const saveDraft = async () => {
    await save.mutateAsync({ appointmentId: appointment.id, body: body || loadedNote?.body || "", supersedesNoteId: loadedNote?.id || null });
    await client.invalidateQueries({ queryKey: sessionNotesQueryKey(accountId) });
    onClose();
  };
  const releaseDraft = async () => {
    if (!loadedNote?.id) return;
    await release.mutateAsync(loadedNote.id);
    await client.invalidateQueries({ queryKey: sessionNotesQueryKey(accountId) });
  };

  return <Dialog open={Boolean(appointment)} onClose={onClose} title="Session note" actions={!isPatient && <><Button variant="secondary" onClick={onClose}>Close</Button><Button busy={save.isPending} disabled={!body.trim()} onClick={saveDraft}>Save draft</Button><Button busy={release.isPending} disabled={!loadedNote || Boolean(loadedNote.released_at)} onClick={releaseDraft}>Release note</Button></>}>
    {isPatient ? (noteQuery.isPending ? <StatusMessage>Loading released note…</StatusMessage> : loadedNote ? <div className="session-note-body">{loadedNote.body}</div> : <StatusMessage>No released note is available.</StatusMessage>) : <><p>Write only the clinical session note. Release is a separate explicit action.</p><textarea aria-label="Session note" rows="10" maxLength={10000} value={body || loadedNote?.body || ""} onChange={(event) => setBody(event.target.value)} />{loadedNote?.released_at && <StatusMessage tone="info">This version is released. Saving creates an immutable amendment.</StatusMessage>}{(save.error || release.error) && <StatusMessage tone="error">The note action could not be completed.</StatusMessage>}</>}
  </Dialog>;
}
