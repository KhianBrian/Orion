import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../features/auth/authContext";
import { createSupportTicket, fetchSupportTicket, fetchSupportTickets, sendSupportTicketMessage, supportTicketQueryKey, supportTicketsQueryKey } from "../features/support/queries";
import "./SupportTickets.css";

const manilaDateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

function TicketList({ tickets, selectedId, onSelect, isAdmin }) {
  if (!tickets.length) return <p className="support-empty">No support tickets yet.</p>;
  return <ul className="support-list">{tickets.map((ticket) => {
    const requesterName = ticket.requester_display_name || ticket.patient_display_name;
    return <li key={ticket.ticket_id}>
      <button className="support-ticket-row" type="button" aria-pressed={ticket.ticket_id === selectedId} onClick={() => onSelect(ticket.ticket_id)}>
        <span className="support-ticket-row__top"><strong>{ticket.category_code === "administrative_help" ? "Administrative help" : ticket.category_code}<span className="support-ticket-row__status">{ticket.status_code}</span></strong>{ticket.has_unread_reply && <span className="support-ticket-row__unread">New reply</span>}</span>
        <span className="support-ticket-row__date">Submitted {manilaDateTime.format(new Date(ticket.created_at))}</span>
        {isAdmin && requesterName && <span className="support-ticket-row__date">Requester: {requesterName} · {ticket.requester_role_code}</span>}
      </button>
    </li>;
  })}</ul>;
}

function Thread({ messages, pending, error, viewerRole }) {
  if (pending) return <StatusMessage>Loading ticket details…</StatusMessage>;
  if (error) return <StatusMessage tone="error">This ticket could not be loaded.</StatusMessage>;
  if (!messages?.length) return <div className="support-thread__empty">Select a ticket to view its conversation.</div>;
  return <div>{messages.map((message) => {
    const authorLabel = message.author_role_code === viewerRole && viewerRole !== "admin"
      ? "You"
      : message.author_role_code === "admin" ? "Orion support" : message.author_role_code === "psychiatrist" ? "Psychiatrist" : "Patient";
    return <article className="support-message" key={message.message_id}>
      <p className="support-message__meta">{authorLabel} · {manilaDateTime.format(new Date(message.created_at))}</p>
      <p className="support-message__body">{message.body}</p>
    </article>;
  })}</div>;
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
    onSuccess: async () => { setBody(""); setMessage({ tone: "success", text: "Your support ticket was submitted." }); await client.invalidateQueries({ queryKey: supportTicketsQueryKey(profile.id) }); },
    onError: () => setMessage({ tone: "error", text: "Your support ticket could not be submitted. Please try again." }),
  });
  const reply = useMutation({
    mutationFn: sendSupportTicketMessage,
    onSuccess: async () => { setReplyBody(""); setMessage({ tone: "success", text: "Your reply was sent." }); await Promise.all([client.invalidateQueries({ queryKey: supportTicketsQueryKey(profile.id) }), client.invalidateQueries({ queryKey: supportTicketQueryKey(profile.id, selectedId) })]); },
    onError: () => setMessage({ tone: "error", text: "Your reply could not be sent. Please try again." }),
  });
  const submit = (event) => { event.preventDefault(); setMessage(null); create.mutate(body); };
  const submitReply = (event) => { event.preventDefault(); setMessage(null); reply.mutate({ ticketId: selectedId, body: replyBody }); };

  return <section className="support-page">
    <header className="support-page__header"><p className="eyebrow">{isAdmin ? "Administrator access" : "Orion support"}</p><h1>{isAdmin ? "Support queue" : "Support"}</h1><p className="marketing-lead">{isAdmin ? "Review administrative support requests. Clinical notes and payment details are not part of this queue." : profile.role === "psychiatrist" ? "Report a software bug or ask for help with an administrative issue." : "Ask Orion for help with an administrative issue."}</p></header>
    {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}
    {listQuery.error && <StatusMessage tone="error">Support tickets could not be loaded. <Button variant="quiet" onClick={() => listQuery.refetch()}>Try again</Button></StatusMessage>}
    <div className="support-page__layout">
      {isRequester && <section className="support-card" aria-labelledby="new-support-ticket-title"><h2 id="new-support-ticket-title">{profile.role === "psychiatrist" ? "Report an issue" : "Ask for administrative help"}</h2><p className="support-warning">Do not include emergency information, diagnoses, treatment details, session notes, payment credentials, or attachments. Orion support is not an emergency service.</p><MessageForm id="supportMessage" label="How can we help?" value={body} onChange={setBody} onSubmit={submit} busy={create.isPending} buttonLabel="Submit ticket" /></section>}
      <section className="support-card" aria-labelledby="support-ticket-list-title"><h2 id="support-ticket-list-title">{isAdmin ? "Open requests" : "Your tickets"}</h2>{listQuery.isPending ? <StatusMessage>Loading support tickets…</StatusMessage> : <TicketList tickets={listQuery.data?.tickets || []} selectedId={selectedId} onSelect={setSelectedId} isAdmin={isAdmin} />}</section>
      <section className="support-card support-thread" aria-labelledby="support-thread-title"><h2 id="support-thread-title">Ticket details</h2><Thread messages={detailQuery.data} pending={detailQuery.isPending} error={detailQuery.error} viewerRole={profile.role} />{selectedId && detailQuery.isSuccess && <MessageForm id="supportReply" label="Reply to this ticket" value={replyBody} onChange={setReplyBody} onSubmit={submitReply} busy={reply.isPending} buttonLabel="Send reply" />}</section>
    </div>
  </section>;
}
