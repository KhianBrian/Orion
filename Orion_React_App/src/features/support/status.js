// Display and option helpers for the support ticket lifecycle. The database is authoritative:
// it re-checks the actor's role and every status move, so this list only shapes the admin controls.
export const SUPPORT_STATUS_LABELS = Object.freeze({
  submitted: "Submitted",
  in_progress: "In progress",
  awaiting_requester: "Awaiting requester",
  resolved: "Resolved",
  closed: "Closed",
});

const NEXT_STATUSES = Object.freeze({
  submitted: ["in_progress", "closed"],
  in_progress: ["awaiting_requester", "resolved", "closed"],
  awaiting_requester: ["in_progress", "resolved", "closed"],
  resolved: ["in_progress", "closed"],
  closed: ["in_progress"],
});

export const SUPPORT_STATUS_REASONS = Object.freeze([
  { value: "abuse", label: "Abuse or misuse" },
  { value: "duplicate", label: "Duplicate request" },
  { value: "requester_confirmed", label: "Requester confirmed it is resolved" },
  { value: "other", label: "Other" },
]);

export const supportStatusLabel = (code) => SUPPORT_STATUS_LABELS[code] || SUPPORT_STATUS_LABELS.submitted;
export const nextSupportStatuses = (code) => NEXT_STATUSES[code] || [];
export const isTicketClosed = (code) => code === "closed";

// Moving a resolved or closed ticket back to in progress is a reopen.
export function supportStatusOptionLabel(from, to) {
  if (to === "in_progress" && (from === "resolved" || from === "closed")) return "Reopen (in progress)";
  return supportStatusLabel(to);
}

// Topics that show a marker in the admin queue so admins treat them with extra care.
export const isSensitiveTopic = (categoryCode) => categoryCode === "clinician_or_user_concern" || categoryCode === "privacy_or_data";

export function supportLifecycleErrorMessage(error) {
  const code = error?.context?.error ?? error?.code ?? "";
  if (code === "support_ticket_closed") return "This ticket is closed. Reopen it to continue.";
  if (code === "support_ticket_transition_not_allowed") return "That status change is not allowed from the current status.";
  return "The ticket could not be updated. Please try again.";
}

// Messages for the limits and the call picker. The code is the generic one the function returns.
export function supportRequestErrorMessage(code, fallback) {
  if (code === "support_rate_limited") return "You have sent a lot of support requests in the last hour. Please wait a little while, then try again.";
  if (code === "invalid_related_call") return "That call could not be attached. Choose another call, or submit without one.";
  return fallback;
}

// Admin search: matches the full call ID or its short ID, ignoring case and dashes.
export function matchesCallSearch(ticket, query) {
  const needle = String(query || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!needle) return true;
  const fullId = String(ticket.related_call_id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const shortId = String(ticket.related_call_reference || "").toLowerCase();
  return fullId.includes(needle) || shortId.includes(needle);
}
