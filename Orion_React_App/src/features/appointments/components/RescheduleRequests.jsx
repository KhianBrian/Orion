import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/ui/Button";
import { StatusMessage } from "../../../components/ui/StatusMessage";
import { reviewReschedule } from "../mutations";
import { fetchRescheduleRequests, rescheduleRequestQueryKey } from "../queries";

const manilaDateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

export function RescheduleRequests({ profile }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: rescheduleRequestQueryKey(profile.id), queryFn: fetchRescheduleRequests });
  const review = useMutation({ mutationFn: reviewReschedule });
  const requests = query.data || [];
  const act = async (item, approve) => {
    await review.mutateAsync({ requestId: item.id, approve, idempotencyKey: crypto.randomUUID() });
    await client.invalidateQueries({ queryKey: rescheduleRequestQueryKey(profile.id) });
    await client.invalidateQueries({ queryKey: ["appointments", profile.id] });
  };
  if (query.isPending) return <StatusMessage>Loading reschedule requests…</StatusMessage>;
  if (query.error) return <StatusMessage tone="error">Reschedule requests could not be loaded.</StatusMessage>;
  if (!requests.length) return null;
  return <section className="reschedule-requests" aria-labelledby="reschedule-requests-title"><h2 id="reschedule-requests-title">Reschedule requests</h2>{requests.map((item) => <article className="reschedule-request" key={item.id}><div><strong>{profile.role === "patient" ? item.psychiatrist_display_name : item.patient_display_name}</strong><p>Current: {manilaDateTime.format(new Date(item.original_starts_at))}</p><p>Requested: {manilaDateTime.format(new Date(item.requested_starts_at))}</p><p className="request-status">Status: {item.status}</p></div>{profile.role === "psychiatrist" && item.status === "pending" && <div className="appointment-card__actions"><Button busy={review.isPending} onClick={() => act(item, true)}>Approve request</Button><Button variant="secondary" busy={review.isPending} onClick={() => act(item, false)}>Decline request</Button></div>}</article>)}</section>;
}
