-- Reschedule approval race: report an overlapping booking as "slot_unavailable".
-- If another patient books a time that overlaps the requested slot while a reschedule request is
-- waiting, the database exclusion constraint appointments_no_overlapping_active_sessions refuses the
-- replacement appointment. The approval function only handled unique violations, so the approving
-- psychiatrist received a raw constraint error (a generic 500). It now receives slot_unavailable (409).
-- The whole approval still rolls back, so the patient's original appointment stays booked.
-- Only the exception clause changes; the rest of the function is as defined in Phase 4.

create or replace function public.review_appointment_reschedule(
  target_request_id uuid, approve boolean, decision_reason text, request_id uuid, actor_profile_id uuid
)
returns table (reschedule_request_id uuid, request_status public.reschedule_request_status, replacement_appointment_id uuid)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare request_row public.reschedule_requests%rowtype; original public.appointments%rowtype; requested public.availability_slots%rowtype; replacement public.appointments%rowtype;
begin
  perform private.assert_service_role();
  if not exists (select 1 from public.profiles where id = actor_profile_id and role = 'psychiatrist') then
    raise exception 'reschedule_not_permitted' using errcode = '42501';
  end if;
  select * into request_row from public.reschedule_requests where id = target_request_id for update;
  if not found or not exists (
    select 1 from public.psychiatrists where id = request_row.psychiatrist_id and profile_id = actor_profile_id
  ) then raise exception 'reschedule_not_permitted' using errcode = '42501'; end if;
  if request_row.status <> 'pending' then
    return query select request_row.id, request_row.status, request_row.replacement_appointment_id; return;
  end if;
  if char_length(coalesce(decision_reason, '')) > 500 then raise exception 'invalid_request' using errcode = '22023'; end if;
  select * into original from public.appointments where id = request_row.original_appointment_id for update;
  if not found or original.status <> 'booked' then raise exception 'reschedule_not_permitted' using errcode = '42501'; end if;
  if not approve then
    update public.reschedule_requests set status = 'declined', decided_at = now(), decided_by = actor_profile_id,
      decision_idempotency_key = request_id, decision_reason = nullif(btrim($3), '') where id = request_row.id returning * into request_row;
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id)
    values (actor_profile_id, 'appointment_reschedule_declined', 'reschedule_request', request_row.id, 'success', 'psychiatrist_declined', request_id);
    return query select request_row.id, request_row.status, request_row.replacement_appointment_id; return;
  end if;
  perform 1 from public.availability_slots where id in (original.slot_id, request_row.requested_slot_id) order by id for update;
  select * into requested from public.availability_slots where id = request_row.requested_slot_id;
  if not exists (
    select 1 from public.availability_slots as slot join public.psychiatrists as psychiatrist on psychiatrist.id = slot.psychiatrist_id
    where slot.id = request_row.requested_slot_id and slot.status = 'open' and slot.starts_at > now() and psychiatrist.is_active
  ) then raise exception 'slot_unavailable' using errcode = 'P0001'; end if;
  update public.appointments set status = 'cancelled', cancelled_at = now(), cancelled_by = 'patient',
    cancellation_idempotency_key = request_id where id = original.id;
  update public.availability_slots set status = 'open' where id = original.slot_id;
  begin
    insert into public.appointments (patient_id, psychiatrist_id, slot_id, starts_at, ends_at, idempotency_key, rescheduled_from_id)
    values (original.patient_id, requested.psychiatrist_id, requested.id, requested.starts_at, requested.ends_at, request_id, original.id)
    returning * into replacement;
  exception when unique_violation or exclusion_violation then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end;
  update public.availability_slots set status = 'booked' where id = request_row.requested_slot_id;
  update public.reschedule_requests set status = 'approved', decided_at = now(), decided_by = actor_profile_id,
    decision_idempotency_key = request_id, decision_reason = nullif(btrim($3), ''), replacement_appointment_id = replacement.id
    where id = request_row.id returning * into request_row;
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id, metadata)
  values (actor_profile_id, 'appointment_reschedule_approved', 'reschedule_request', request_row.id, 'success', request_id,
    jsonb_build_object('original_appointment_id', original.id, 'replacement_appointment_id', replacement.id));
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id, metadata)
  values (actor_profile_id, 'appointment_cancelled', 'appointment', original.id, 'success', request_id,
    jsonb_build_object('cancellation_party', 'patient', 'rescheduled_to', replacement.id));
  return query select request_row.id, request_row.status, replacement.id;
end;
$$;

revoke all on function public.review_appointment_reschedule(uuid, boolean, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.review_appointment_reschedule(uuid, boolean, text, uuid, uuid) to service_role;
