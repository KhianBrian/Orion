import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../features/auth/authContext";
import { createSupportTicket, fetchSupportTicket, fetchSupportTickets, sendSupportTicketMessage, supportTicketQueryKey, supportTicketsQueryKey } from "../features/support/queries";
import "./SupportTickets.css";

const manilaDateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });
const supportTopics = [
  { value: "technical_issue", label: "App bug or technical issue", hint: "Something is broken, missing, or behaving unexpectedly." },
  { value: "account_access", label: "Account or sign-in", hint: "Sign-in, profile, password, or access problems." },
  { value: "booking_scheduling", label: "Booking or scheduling", hint: "Appointments, availability, cancellations, or rescheduling." },
  { value: "payment_billing", label: "Payment or billing", hint: "Charges, receipts, refunds, or payment status." },
  { value: "clinician_or_user_concern", label: "Concern about a psychiatrist or user", hint: "A conduct, communication, or interaction concern." },
  { value: "privacy_or_data", label: "Privacy or personal data", hint: "A concern about account data or how information is handled." },
  { value: "other", label: "Something else", hint: "Anything administrative that does not fit the topics above." },
];
const topicLabel = (value) => supportTopics.find((topic) => topic.value === value)?.label || "Support request";
const attachmentTypes = ["image/png", "image/jpeg", "application/pdf", "text/plain"];
const maxAttachmentBytes = 10 * 1024 * 1024;
const formatBytes = (bytes) => bytes < 1024 * 1024 ? Math.ceil(bytes / 1024) + " KB" : (bytes / (1024 * 1024)).toFixed(1) + " MB";
const legacyTopic = (body) => {
  const match = body.match(/^Topic: ([a-z_]+)\n\n/);
  return match ? { label: topicLabel(match[1]), body: body.slice(match[0].length) } : { label: null, body };
};

function TicketList({ tickets, selectedId, onSelect, isAdmin }) {
  if (!tickets.length) return <p className="support-empty">No support tickets yet.</p>;
  return <ul className="support-list">{tickets.map((ticket) => {
    const requesterName = ticket.requester_display_name || ticket.patient_display_name;
    return <li key={ticket.ticket_id}>
      <button className="support-ticket-row" type="button" aria-pressed={ticket.ticket_id === selectedId} onClick={() => onSelect(ticket.ticket_id)}>
        <span className="support-ticket-row__top"><strong>{topicLabel(ticket.category_code)}<span className="support-ticket-row__status">{ticket.status_code.replaceAll("_", " ")}</span></strong>{ticket.has_unread_reply && <span className="support-ticket-row__unread">New reply</span>}</span>
        <span className="support-ticket-row__date">Submitted {manilaDateTime.format(new Date(ticket.created_at))}</span>
        {isAdmin && requesterName && <span className="support-ticket-row__date">Requester: {requesterName} · {ticket.requester_role_code}</span>}
      </button>
    </li>;
  })}</ul>;
}

function Thread({ messages, attachments, pending, error, viewerRole }) {
  if (pending) return <StatusMessage>Loading ticket details…</StatusMessage>;
  if (error) return <StatusMessage tone="error">This ticket could not be loaded.</StatusMessage>;
  if (!messages?.length) return <div className="support-thread__empty">Select a ticket to view its conversation.</div>;
  const initialTopic = messages[0]?.message_kind_code === "initial_submission" ? legacyTopic(messages[0].body) : { label: null };
  return <div>{initialTopic.label && <p className="support-thread__topic">Topic: {initialTopic.label}</p>}{messages.map((message, index) => {
    const authorLabel = message.author_role_code === viewerRole && viewerRole !== "admin"
      ? "You"
      : message.author_role_code === "admin" ? "Orion support" : message.author_role_code === "psychiatrist" ? "Psychiatrist" : "Patient";
    return <article className="support-message" key={message.message_id}>
      <p className="support-message__meta">{authorLabel} · {manilaDateTime.format(new Date(message.created_at))}</p>
      <p className="support-message__body">{index === 0 ? legacyTopic(message.body).body : message.body}</p>
    </article>;
  })}{attachments?.length > 0 && <section className="support-attachments" aria-labelledby="support-attachments-title"><h3 id="support-attachments-title">Attachments</h3><ul>{attachments.map((attachment) => <li key={attachment.attachment_id}><a href={attachment.download_url} target="_blank" rel="noreferrer">{attachment.original_name}</a><span>{formatBytes(attachment.size_bytes)}</span></li>)}</ul></section>}</div>;
}

function MessageForm({ id, label, value, onChange, onSubmit, busy, buttonLabel }) {
  return <form className="support-form support-reply-form" onSubmit={onSubmit}>
    <label htmlFor={id}>{label}</label>
    <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength="2000" required placeholder="Write a reply…" />
    <p className="support-form__meta">{value.length}/2000 characters</p>
    <Button type="submit" busy={busy} disabled={!value.trim()}>{busy ? "Sending…" : buttonLabel}</Button>
  </form>;
}

export default function SupportTickets() {
  const { profile } = useAuth();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const [categoryCode, setCategoryCode] = useState("technical_issue");
  const [files, setFiles] = useState([]);
  const [replyBody, setReplyBody] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState(null);
  const isAdmin = profile.role === "admin";
  const isRequester = profile.role === "patient" || profile.role === "psychiatrist";
  const listQuery = useQuery({ queryKey: supportTicketsQueryKey(profile.id), queryFn: fetchSupportTickets });
  const detailQuery = useQuery({ queryKey: supportTicketQueryKey(profile.id, selectedId), queryFn: fetchSupportTicket, enabled: Boolean(selectedId) });

  useEffect(() => {
    if (selectedId && detailQuery.isSuccess) client.invalidateQueries({ queryKey: supportTicketsQueryKey(profile.id) });
  }, [client, detailQuery.isSuccess, profile.id, selectedId]);

  const create = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: async (result) => { setBody(""); setFiles([]); setCategoryCode("technical_issue"); setSelectedId(result?.ticket?.ticket_id || null); setMessage({ tone: "success", text: "Your support ticket was submitted." }); await client.invalidateQueries({ queryKey: supportTicketsQueryKey(profile.id) }); },
    onError: () => setMessage({ tone: "error", text: "Your support ticket could not be submitted. Please try again." }),
  });
  const reply = useMutation({
    mutationFn: sendSupportTicketMessage,
    onSuccess: async () => { setReplyBody(""); setMessage({ tone: "success", text: "Your reply was sent." }); await Promise.all([client.invalidateQueries({ queryKey: supportTicketsQueryKey(profile.id) }), client.invalidateQueries({ queryKey: supportTicketQueryKey(profile.id, selectedId) })]); },
    onError: () => setMessage({ tone: "error", text: "Your reply could not be sent. Please try again." }),
  });
  const submit = (event) => { event.preventDefault(); setMessage(null); create.mutate({ categoryCode, body, files }); };
  const selectFiles = (event) => {
    const nextFiles = Array.from(event.target.files || []);
    if (nextFiles.length > 3 || nextFiles.some((file) => !attachmentTypes.includes(file.type) || file.size > maxAttachmentBytes)) {
      setMessage({ tone: "error", text: "Choose up to 3 PNG, JPEG, PDF, or text files under 10 MB each." });
      event.target.value = "";
      return;
    }
    setFiles(nextFiles);
  };
  const submitReply = (event) => { event.preventDefault(); setMessage(null); reply.mutate({ ticketId: selectedId, body: replyBody }); };

  return <section className="support-page">
    <header className="support-page__header"><p className="eyebrow">{isAdmin ? "Administrator access" : "Orion support"}</p><h1>{isAdmin ? "Support queue" : "Support"}</h1><p className="marketing-lead">{isAdmin ? "Review reported issues, booking questions, billing concerns, and account requests. Clinical notes are not part of this queue." : profile.role === "psychiatrist" ? "Report a product issue or ask Orion for help with bookings, billing, access, or a user concern." : "Tell Orion what went wrong and we’ll route it to the right support team."}</p></header>
    {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}
    {listQuery.error && <StatusMessage tone="error">Support tickets could not be loaded. <Button variant="quiet" onClick={() => listQuery.refetch()}>Try again</Button></StatusMessage>}
    <div className={"support-page__layout" + (selectedId ? " support-page__layout--selected" : "")}>
      {isRequester && <section className="support-card support-card--new" aria-labelledby="new-support-ticket-title"><h2 id="new-support-ticket-title">{profile.role === "psychiatrist" ? "Report an issue" : "Contact support"}</h2><p className="support-intro">Choose the closest topic so the right Orion team can triage your request.</p><p className="support-warning"><strong>Use Orion support for:</strong> app issues, account access, bookings, billing, privacy, or concerns about an interaction on the platform. Do not share emergency details, diagnoses, treatment details, session notes, passwords, or card numbers. If there is immediate danger, contact local emergency services.</p><form className="support-form" onSubmit={submit}><label htmlFor="supportTopic">What do you need help with?</label><select id="supportTopic" value={categoryCode} onChange={(event) => setCategoryCode(event.target.value)}>{supportTopics.map((topic) => <option key={topic.value} value={topic.value}>{topic.label}</option>)}</select><p className="support-topic-hint">{supportTopics.find((topic) => topic.value === categoryCode)?.hint}</p><label htmlFor="supportMessage">Tell us what happened</label><textarea id="supportMessage" value={body} onChange={(event) => setBody(event.target.value)} maxLength="2000" required placeholder="Include the non-sensitive details support needs to help…" /><p className="support-form__meta">{body.length}/2000 characters</p><label className="support-file-label" htmlFor="supportFiles">Attach screenshots or receipts <span>(optional)</span></label><input id="supportFiles" type="file" accept={attachmentTypes.join(",")} multiple onChange={selectFiles} /><p className="support-topic-hint">Up to 3 files, 10 MB each. PNG, JPEG, PDF, or text only.</p>{files.length > 0 && <ul className="support-selected-files">{files.map((file) => <li key={file.name + file.lastModified}>{file.name} <span>{formatBytes(file.size)}</span></li>)}</ul>}<Button type="submit" busy={create.isPending} disabled={!body.trim()}>{create.isPending ? "Submitting…" : "Submit ticket"}</Button></form></section>}
      <section className="support-card" aria-labelledby="support-ticket-list-title"><h2 id="support-ticket-list-title">{isAdmin ? "Open requests" : "Your tickets"}</h2>{listQuery.isPending ? <StatusMessage>Loading support tickets…</StatusMessage> : <TicketList tickets={listQuery.data?.tickets || []} selectedId={selectedId} onSelect={setSelectedId} isAdmin={isAdmin} />}</section>
      {selectedId && <section className="support-card support-thread" aria-labelledby="support-thread-title"><h2 id="support-thread-title">Ticket details</h2><Thread messages={detailQuery.data?.messages} attachments={detailQuery.data?.attachments} pending={detailQuery.isPending} error={detailQuery.error} viewerRole={profile.role} />{detailQuery.isSuccess && <MessageForm id="supportReply" label="Reply to this ticket" value={replyBody} onChange={setReplyBody} onSubmit={submitReply} busy={reply.isPending} buttonLabel="Send reply" />}</section>}
    </div>
  </section>;
}
