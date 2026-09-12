-- Phase 4: one safe scheduling workflow.
-- Forward-only extension of the Phase 2/3 synthetic schema. Payment, video,
-- and clinician-managed availability remain owned by later phases.

alter table public.audit_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table public.system_controls (
  control_key text primary key,
  enabled boolean not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint system_controls_known_key check (control_key in ('booking_enabled'))
);

insert into public.system_controls (control_key, enabled)
values ('booking_enabled', true)
on conflict (control_key) do nothing;

alter table public.system_controls enable row level security;
revoke all on table public.system_controls from anon, authenticated;
grant all on table public.system_controls to service_role;

alter table public.appointments
  add column cancellation_reason_code text,
  add column cancellation_explanation text,
  add column outcome_idempotency_key uuid,
  add column outcome_correction_idempotency_key uuid;

alter table public.appointments
  add constraint appointments_operational_cancellation_reason_check
  check (
    cancelled_by in ('psychiatrist', 'admin')
    and cancellation_reason_code in (
      'psychiatrist_unavailable',
      'psychiatrist_emergency',
      'technical_problem',
      'safety_or_clinical_direction',
      'scheduling_or_administrative_error',
      'other_operational_reason'
    )
    or cancelled_by not in ('psychiatrist', 'admin')
    or cancelled_by is null
  ),
  add constraint appointments_cancellation_explanation_length_check
  check (cancellation_explanation is null or char_length(cancellation_explanation) <= 500),
  add constraint appointments_other_cancellation_explanation_check
  check (
    cancellation_reason_code <> 'other_operational_reason'
    or length(btrim(coalesce(cancellation_explanation, ''))) > 0
  );

create unique index appointments_outcome_idempotency_key
  on public.appointments (id, outcome_idempotency_key)
  where outcome_idempotency_key is not null;

create unique index appointments_outcome_correction_idempotency_key
  on public.appointments (id, outcome_correction_idempotency_key)
  where outcome_correction_idempotency_key is not null;

create type public.reschedule_request_status as enum ('pending', 'approved', 'declined');

create table public.reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  original_appointment_id uuid not null references public.appointments (id) on delete restrict,
  patient_id uuid not null references public.profiles (id) on delete restrict,
  psychiatrist_id uuid not null references public.psychiatrists (id) on delete restrict,
  requested_slot_id uuid not null references public.availability_slots (id) on delete restrict,
  status public.reschedule_request_status not null default 'pending',
  idempotency_key uuid not null,
  decision_idempotency_key uuid,
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null,
  decision_reason text,
  replacement_appointment_id uuid references public.appointments (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reschedule_requests_decision_facts_check check (
    (status = 'pending' and decided_at is null and decided_by is null and replacement_appointment_id is null)
    or (status = 'declined' and decided_at is not null and decided_by is not null and replacement_appointment_id is null)
    or (status = 'approved' and decided_at is not null and decided_by is not null and replacement_appointment_id is not null)
  ),
  constraint reschedule_requests_decision_reason_length_check check (decision_reason is null or char_length(decision_reason) <= 500)
);

create unique index reschedule_requests_patient_idempotency_key
  on public.reschedule_requests (patient_id, idempotency_key);
create unique index reschedule_requests_one_pending_per_appointment
  on public.reschedule_requests (original_appointment_id)
  where status = 'pending';
create unique index reschedule_requests_decision_idempotency_key
  on public.reschedule_requests (id, decision_idempotency_key)
  where decision_idempotency_key is not null;
create index reschedule_requests_psychiatrist_status_idx
  on public.reschedule_requests (psychiatrist_id, status, created_at);
create index reschedule_requests_patient_created_at_idx
  on public.reschedule_requests (patient_id, created_at desc);

create trigger reschedule_requests_set_updated_at
before update on public.reschedule_requests
for each row execute function private.set_updated_at();

alter table public.reschedule_requests enable row level security;
revoke all on table public.reschedule_requests from anon, authenticated;
grant all on table public.reschedule_requests to service_role;

create type public.cancellation_reason_code as enum (
  'psychiatrist_unavailable',
  'psychiatrist_emergency',
  'technical_problem',
  'safety_or_clinical_direction',
  'scheduling_or_administrative_error',
  'other_operational_reason'
);

create or replace function private.assert_service_role()
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'operation_not_permitted' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.assert_service_role() from public, anon, authenticated;

create or replace function private.valid_cancellation_reason(
  reason_code text,
  explanation text
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select reason_code in (
    'psychiatrist_unavailable', 'psychiatrist_emergency', 'technical_problem',
    'safety_or_clinical_direction', 'scheduling_or_administrative_error',
    'other_operational_reason'
  )
  and (reason_code <> 'other_operational_reason' or length(btrim(coalesce(explanation, ''))) > 0)
  and char_length(coalesce(explanation, '')) <= 500;
$$;

create or replace function public.get_booking_status()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  result boolean;
begin
  if actor_id is null or private.current_app_role() <> 'admin' then
    raise exception 'booking_status_not_permitted' using errcode = '42501';
  end if;
  select enabled into result from public.system_controls where control_key = 'booking_enabled';
  return coalesce(result, false);
end;
$$;
revoke all on function public.get_booking_status() from public, anon;
grant execute on function public.get_booking_status() to authenticated;

create or replace function public.set_booking_enabled(
  next_enabled boolean,
  actor_profile_id uuid,
  request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  previous_enabled boolean;
begin
  perform private.assert_service_role();
  if actor_profile_id is null or not exists (
    select 1 from public.profiles where id = actor_profile_id and role = 'admin'
  ) then
    raise exception 'booking_control_not_permitted' using errcode = '42501';
  end if;
  select enabled into previous_enabled from public.system_controls
  where control_key = 'booking_enabled' for update;
  update public.system_controls
  set enabled = next_enabled, updated_by = actor_profile_id, updated_at = now()
  where control_key = 'booking_enabled';
  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id, metadata
  ) values (
    actor_profile_id, 'booking_kill_switch_changed', 'system_control', null, 'success',
    case when next_enabled then 'enabled' else 'disabled' end, request_id,
    jsonb_build_object('previous_enabled', previous_enabled, 'next_enabled', next_enabled)
  );
  return next_enabled;
end;
$$;
revoke all on function public.set_booking_enabled(boolean, uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_booking_enabled(boolean, uuid, uuid) to service_role;

create or replace function public.book_appointment_for_patient(
  requested_slot_id uuid,
  request_id uuid,
  actor_profile_id uuid
)
returns table (
  appointment_id uuid,
  slot_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  appointment_status public.appointment_status
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  locked_slot public.availability_slots%rowtype;
  existing_appointment public.appointments%rowtype;
  booking_enabled boolean;
begin
  perform private.assert_service_role();
  if actor_profile_id is null or request_id is null or requested_slot_id is null or not exists (
    select 1 from public.profiles where id = actor_profile_id and role = 'patient'
  ) then
    raise exception 'booking_not_permitted' using errcode = '42501';
  end if;

  select * into existing_appointment from public.appointments
  where patient_id = actor_profile_id and idempotency_key = request_id;
  if found then
    if existing_appointment.slot_id <> requested_slot_id then
      raise exception 'booking_not_permitted' using errcode = '42501';
    end if;
    return query select existing_appointment.id, existing_appointment.slot_id,
      existing_appointment.starts_at, existing_appointment.ends_at, existing_appointment.status;
    return;
  end if;

  select enabled into booking_enabled from public.system_controls
  where control_key = 'booking_enabled';
  if not coalesce(booking_enabled, false) then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id)
    values (actor_profile_id, 'appointment_booking_denied', 'availability_slot', requested_slot_id, 'denied', 'booking_disabled', request_id);
    raise exception 'booking_disabled' using errcode = 'P0001';
  end if;

  select * into locked_slot from public.availability_slots
  where id = requested_slot_id for update;
  if not found or locked_slot.status <> 'open' or locked_slot.starts_at <= now()
     or not exists (select 1 from public.psychiatrists where id = locked_slot.psychiatrist_id and is_active) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  begin
    insert into public.appointments (
      patient_id, psychiatrist_id, slot_id, starts_at, ends_at, idempotency_key
    ) values (
      actor_profile_id, locked_slot.psychiatrist_id, locked_slot.id,
      locked_slot.starts_at, locked_slot.ends_at, request_id
    ) returning * into existing_appointment;
  exception when unique_violation then
    select * into existing_appointment from public.appointments
    where patient_id = actor_profile_id and idempotency_key = request_id;
    if found then
      return query select existing_appointment.id, existing_appointment.slot_id,
        existing_appointment.starts_at, existing_appointment.ends_at, existing_appointment.status;
      return;
    end if;
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end;

  update public.availability_slots set status = 'booked' where id = locked_slot.id;
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id)
  values (actor_profile_id, 'appointment_booked', 'appointment', existing_appointment.id, 'success', request_id);
  return query select existing_appointment.id, existing_appointment.slot_id,
    existing_appointment.starts_at, existing_appointment.ends_at, existing_appointment.status;
end;
$$;
revoke all on function public.book_appointment_for_patient(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.book_appointment_for_patient(uuid, uuid, uuid) to service_role;

create or replace function public.cancel_appointment_for_patient(
  appointment_id uuid,
  request_id uuid,
  actor_profile_id uuid
)
returns table (
  cancelled_appointment_id uuid,
  slot_id uuid,
  appointment_status public.appointment_status,
  cancelled_at timestamptz,
  cancelled_by public.cancellation_party
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  locked_appointment public.appointments%rowtype;
  locked_slot public.availability_slots%rowtype;
  cancellation_time timestamptz := now();
begin
  perform private.assert_service_role();
  if actor_profile_id is null or request_id is null or appointment_id is null
     or not exists (select 1 from public.profiles where id = actor_profile_id and role = 'patient') then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;
  select * into locked_appointment from public.appointments where id = cancel_appointment_for_patient.appointment_id for update;
  if not found or locked_appointment.patient_id <> actor_profile_id then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.appointments where patient_id = actor_profile_id
      and cancellation_idempotency_key = request_id and id <> locked_appointment.id
  ) then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;
  if locked_appointment.status = 'cancelled' and locked_appointment.cancellation_idempotency_key = request_id then
    return query select locked_appointment.id, locked_appointment.slot_id, locked_appointment.status,
      locked_appointment.cancelled_at, locked_appointment.cancelled_by;
    return;
  end if;
  if locked_appointment.status <> 'booked' or locked_appointment.starts_at <= now() + interval '24 hours' then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;
  select * into locked_slot from public.availability_slots where id = locked_appointment.slot_id for update;
  if not found then raise exception 'cancellation_not_permitted' using errcode = '42501'; end if;
  update public.appointments set status = 'cancelled', cancelled_at = cancellation_time,
    cancelled_by = 'patient', cancellation_idempotency_key = request_id,
    cancellation_reason_code = null, cancellation_explanation = null
  where id = locked_appointment.id;
  if exists (select 1 from public.psychiatrists where id = locked_appointment.psychiatrist_id and is_active) then
    update public.availability_slots set status = 'open' where id = locked_slot.id;
  end if;
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id)
  values (actor_profile_id, 'appointment_cancelled', 'appointment', locked_appointment.id, 'success', request_id);
  return query select locked_appointment.id, locked_appointment.slot_id, 'cancelled'::public.appointment_status,
    cancellation_time, 'patient'::public.cancellation_party;
end;
$$;
revoke all on function public.cancel_appointment_for_patient(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_appointment_for_patient(uuid, uuid, uuid) to service_role;

create or replace function private.cancel_appointment_for_clinician(
  target_appointment_id uuid,
  request_id uuid,
  reason_code text,
  explanation text,
  actor_profile_id uuid,
  admin_action boolean
)
returns public.appointments
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  locked_appointment public.appointments%rowtype;
  actor_role public.app_role;
begin
  perform private.assert_service_role();
  select role into actor_role from public.profiles where id = actor_profile_id;
  if (admin_action and actor_role <> 'admin') or (not admin_action and actor_role <> 'psychiatrist')
     or not private.valid_cancellation_reason(reason_code, explanation) then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;
  select appointment.* into locked_appointment from public.appointments as appointment
  where appointment.id = target_appointment_id for update;
  if not found or locked_appointment.status <> 'booked' then
    if found and locked_appointment.status = 'cancelled' and locked_appointment.cancellation_idempotency_key = request_id then
      return locked_appointment;
    end if;
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;
  if not admin_action and not exists (
    select 1 from public.psychiatrists where id = locked_appointment.psychiatrist_id and profile_id = actor_profile_id and is_active
  ) then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;
  if admin_action and locked_appointment.starts_at > now() + interval '48 hours' then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;
  if not admin_action and locked_appointment.starts_at <= now() + interval '48 hours' then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;
  update public.appointments set status = 'cancelled', cancelled_at = now(),
    cancelled_by = case when admin_action then 'admin'::public.cancellation_party else 'psychiatrist'::public.cancellation_party end,
    cancellation_idempotency_key = request_id, cancellation_reason_code = reason_code,
    cancellation_explanation = nullif(btrim(explanation), '')
  where id = locked_appointment.id;
  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id, metadata
  ) values (
    actor_profile_id,
    case when admin_action then 'appointment_admin_cancelled' else 'appointment_psychiatrist_cancelled' end,
    'appointment', locked_appointment.id, 'success', reason_code, request_id,
    jsonb_build_object('cancellation_party', case when admin_action then 'admin' else 'psychiatrist' end)
  );
  return locked_appointment;
end;
$$;
revoke all on function private.cancel_appointment_for_clinician(uuid, uuid, text, text, uuid, boolean) from public, anon, authenticated;

create or replace function public.cancel_appointment_for_psychiatrist(
  appointment_id uuid, request_id uuid, reason_code text, explanation text, actor_profile_id uuid
)
returns table (cancelled_appointment_id uuid, appointment_status public.appointment_status, cancelled_at timestamptz, cancelled_by public.cancellation_party)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare result public.appointments;
begin
  result := private.cancel_appointment_for_clinician(appointment_id, request_id, reason_code, explanation, actor_profile_id, false);
  return query select result.id, result.status, result.cancelled_at, result.cancelled_by;
end;
$$;
revoke all on function public.cancel_appointment_for_psychiatrist(uuid, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.cancel_appointment_for_psychiatrist(uuid, uuid, text, text, uuid) to service_role;

create or replace function public.cancel_appointment_for_admin(
  appointment_id uuid, request_id uuid, reason_code text, explanation text, actor_profile_id uuid
)
returns table (cancelled_appointment_id uuid, appointment_status public.appointment_status, cancelled_at timestamptz, cancelled_by public.cancellation_party)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare result public.appointments;
begin
  result := private.cancel_appointment_for_clinician(appointment_id, request_id, reason_code, explanation, actor_profile_id, true);
  return query select result.id, result.status, result.cancelled_at, result.cancelled_by;
end;
$$;
revoke all on function public.cancel_appointment_for_admin(uuid, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.cancel_appointment_for_admin(uuid, uuid, text, text, uuid) to service_role;

create or replace function public.request_appointment_reschedule(
  target_appointment_id uuid, requested_slot_id uuid, request_id uuid, actor_profile_id uuid
)
returns table (reschedule_request_id uuid, original_appointment_id uuid, replacement_slot_id uuid, request_status public.reschedule_request_status)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare original public.appointments%rowtype; requested public.availability_slots%rowtype; existing public.reschedule_requests%rowtype;
begin
  perform private.assert_service_role();
  if not exists (select 1 from public.profiles where id = actor_profile_id and role = 'patient') then
    raise exception 'reschedule_not_permitted' using errcode = '42501';
  end if;
  select * into existing from public.reschedule_requests where patient_id = actor_profile_id and idempotency_key = request_id;
  if found then
    if existing.original_appointment_id <> target_appointment_id or existing.requested_slot_id <> requested_slot_id then
      raise exception 'reschedule_not_permitted' using errcode = '42501';
    end if;
    return query select existing.id, existing.original_appointment_id, existing.requested_slot_id, existing.status;
    return;
  end if;
  select * into original from public.appointments where id = target_appointment_id for update;
  if not found or original.patient_id <> actor_profile_id or original.status <> 'booked'
     or original.starts_at <= now() + interval '24 hours' then
    raise exception 'reschedule_not_permitted' using errcode = '42501';
  end if;
  select * into requested from public.availability_slots where id = requested_slot_id for update;
  if not found or requested.status <> 'open' or requested.starts_at <= now()
     or requested.psychiatrist_id <> original.psychiatrist_id then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;
  begin
    insert into public.reschedule_requests (original_appointment_id, patient_id, psychiatrist_id, requested_slot_id, idempotency_key)
    values (original.id, actor_profile_id, original.psychiatrist_id, requested.id, request_id)
    returning * into existing;
  exception when unique_violation then
    select * into existing from public.reschedule_requests where patient_id = actor_profile_id and idempotency_key = request_id;
    if found then return query select existing.id, existing.original_appointment_id, existing.requested_slot_id, existing.status; return; end if;
    raise exception 'reschedule_pending' using errcode = 'P0001';
  end;
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id)
  values (actor_profile_id, 'appointment_reschedule_requested', 'reschedule_request', existing.id, 'success', request_id);
  return query select existing.id, existing.original_appointment_id, existing.requested_slot_id, existing.status;
end;
$$;
revoke all on function public.request_appointment_reschedule(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.request_appointment_reschedule(uuid, uuid, uuid, uuid) to service_role;

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
      decision_idempotency_key = request_id, decision_reason = nullif(btrim(decision_reason), '') where id = request_row.id returning * into request_row;
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
    select original.patient_id, requested.psychiatrist_id, requested.id, requested.starts_at, requested.ends_at, request_id, original.id
    from public.availability_slots as requested where requested.id = request_row.requested_slot_id
    returning * into replacement;
  exception when unique_violation then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end;
  update public.availability_slots set status = 'booked' where id = request_row.requested_slot_id;
  update public.reschedule_requests set status = 'approved', decided_at = now(), decided_by = actor_profile_id,
    decision_idempotency_key = request_id, decision_reason = nullif(btrim(decision_reason), ''), replacement_appointment_id = replacement.id
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

create or replace function public.get_my_reschedule_requests(actor_profile_id uuid)
returns table (
  id uuid, original_appointment_id uuid, requested_slot_id uuid,
  original_starts_at timestamptz, requested_starts_at timestamptz,
  status public.reschedule_request_status, patient_display_name text, psychiatrist_display_name text
)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select r.id, r.original_appointment_id, r.requested_slot_id,
    original_appointment.starts_at, requested_slot.starts_at, r.status,
    patient.full_name, psychiatrist.display_name
  from public.reschedule_requests r
  join public.appointments original_appointment on original_appointment.id = r.original_appointment_id
  join public.availability_slots requested_slot on requested_slot.id = r.requested_slot_id
  join public.profiles patient on patient.id = r.patient_id
  join public.psychiatrists psychiatrist on psychiatrist.id = r.psychiatrist_id
  join public.profiles actor on actor.id = actor_profile_id
  where (actor.role = 'patient' and r.patient_id = actor.id)
     or (actor.role = 'psychiatrist' and psychiatrist.profile_id = actor.id);
$$;
revoke all on function public.get_my_reschedule_requests(uuid) from public, anon, authenticated;
grant execute on function public.get_my_reschedule_requests(uuid) to service_role;

create or replace function public.record_appointment_outcome(
  target_appointment_id uuid, next_status public.appointment_status, absent_party public.no_show_party,
  request_id uuid, actor_profile_id uuid
)
returns table (appointment_id uuid, appointment_status public.appointment_status, no_show_party public.no_show_party)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare locked public.appointments%rowtype; psychiatrist_id uuid;
begin
  perform private.assert_service_role();
  select id into psychiatrist_id from public.psychiatrists where profile_id = actor_profile_id and is_active;
  if psychiatrist_id is null or next_status not in ('completed', 'no_show') then raise exception 'outcome_not_permitted' using errcode = '42501'; end if;
  select * into locked from public.appointments where id = target_appointment_id for update;
  if not found or locked.psychiatrist_id <> psychiatrist_id then raise exception 'outcome_not_permitted' using errcode = '42501'; end if;
  if locked.status in ('completed', 'no_show') and locked.outcome_idempotency_key = request_id then
    if locked.status <> next_status or locked.no_show_party is distinct from absent_party then
      raise exception 'outcome_not_permitted' using errcode = '42501';
    end if;
    return query select locked.id, locked.status, locked.no_show_party; return;
  end if;
  if locked.status <> 'booked' or locked.starts_at > now() or (next_status = 'no_show' and now() < locked.starts_at + interval '15 minutes')
     or (next_status = 'no_show' and absent_party is null) or (next_status = 'completed' and absent_party is not null) then
    raise exception 'outcome_not_permitted' using errcode = '42501';
  end if;
  update public.appointments set status = next_status, no_show_party = absent_party, outcome_idempotency_key = request_id where id = locked.id returning * into locked;
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id, metadata)
  values (actor_profile_id, 'appointment_outcome_recorded', 'appointment', locked.id, 'success', request_id,
    jsonb_build_object('status', next_status, 'no_show_party', absent_party));
  return query select locked.id, locked.status, locked.no_show_party;
end;
$$;
revoke all on function public.record_appointment_outcome(uuid, public.appointment_status, public.no_show_party, uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_appointment_outcome(uuid, public.appointment_status, public.no_show_party, uuid, uuid) to service_role;

create or replace function public.correct_appointment_outcome(
  target_appointment_id uuid, next_status public.appointment_status, absent_party public.no_show_party,
  request_id uuid, actor_profile_id uuid
)
returns table (appointment_id uuid, appointment_status public.appointment_status, no_show_party public.no_show_party)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare locked public.appointments%rowtype; previous_status public.appointment_status; previous_party public.no_show_party;
begin
  perform private.assert_service_role();
  if not exists (select 1 from public.profiles where id = actor_profile_id and role = 'admin')
     or next_status not in ('completed', 'no_show') or (next_status = 'no_show' and absent_party is null)
     or (next_status = 'completed' and absent_party is not null) then raise exception 'outcome_not_permitted' using errcode = '42501'; end if;
  select * into locked from public.appointments where id = target_appointment_id for update;
  if not found or locked.status not in ('completed', 'no_show') then raise exception 'outcome_not_permitted' using errcode = '42501'; end if;
  if locked.outcome_correction_idempotency_key = request_id then
    if locked.status <> next_status or locked.no_show_party is distinct from absent_party then
      raise exception 'outcome_not_permitted' using errcode = '42501';
    end if;
    return query select locked.id, locked.status, locked.no_show_party; return;
  end if;
  previous_status := locked.status; previous_party := locked.no_show_party;
  update public.appointments set status = next_status, no_show_party = absent_party, outcome_correction_idempotency_key = request_id where id = locked.id returning * into locked;
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id, metadata)
  values (actor_profile_id, 'appointment_outcome_corrected', 'appointment', locked.id, 'success', request_id,
    jsonb_build_object('previous_status', previous_status, 'previous_no_show_party', previous_party, 'next_status', next_status, 'next_no_show_party', absent_party));
  return query select locked.id, locked.status, locked.no_show_party;
end;
$$;
revoke all on function public.correct_appointment_outcome(uuid, public.appointment_status, public.no_show_party, uuid, uuid) from public, anon, authenticated;
grant execute on function public.correct_appointment_outcome(uuid, public.appointment_status, public.no_show_party, uuid, uuid) to service_role;

create or replace function public.get_my_appointments_detailed()
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, status public.appointment_status,
  counterpart_display_name text, cancelled_by public.cancellation_party, cancellation_reason_code text,
  rescheduled_from_id uuid, replacement_appointment_id uuid
)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select a.id, a.starts_at, a.ends_at, a.status,
    case when p.role = 'patient' then psy.display_name else patient.full_name end,
    a.cancelled_by, a.cancellation_reason_code, a.rescheduled_from_id,
    (select replacement.id from public.appointments replacement where replacement.rescheduled_from_id = a.id limit 1)
  from public.profiles p
  join public.appointments a on (p.role = 'patient' and a.patient_id = p.id)
    or (p.role = 'psychiatrist' and exists (select 1 from public.psychiatrists assigned where assigned.id = a.psychiatrist_id and assigned.profile_id = p.id))
  join public.psychiatrists psy on psy.id = a.psychiatrist_id
  join public.profiles patient on patient.id = a.patient_id
  where p.id = auth.uid() and p.role in ('patient', 'psychiatrist')
  order by a.starts_at asc;
$$;
revoke all on function public.get_my_appointments_detailed() from public, anon;
grant execute on function public.get_my_appointments_detailed() to authenticated;

create or replace function public.get_admin_appointments()
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, status public.appointment_status,
  patient_display_name text, psychiatrist_display_name text, cancelled_by public.cancellation_party,
  cancellation_reason_code text, rescheduled_from_id uuid, replacement_appointment_id uuid
)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select a.id, a.starts_at, a.ends_at, a.status, patient.full_name, psy.display_name, a.cancelled_by,
    a.cancellation_reason_code, a.rescheduled_from_id,
    (select replacement.id from public.appointments replacement where replacement.rescheduled_from_id = a.id limit 1)
  from public.appointments a
  join public.profiles actor on actor.id = auth.uid() and actor.role = 'admin'
  join public.profiles patient on patient.id = a.patient_id
  join public.psychiatrists psy on psy.id = a.psychiatrist_id
  order by a.starts_at asc;
$$;
revoke all on function public.get_admin_appointments() from public, anon;
grant execute on function public.get_admin_appointments() to authenticated;

create or replace function public.get_my_session_notes(actor_profile_id uuid)
returns table (
  id uuid, appointment_id uuid, version_number integer, supersedes_note_id uuid,
  released_at timestamptz, created_at timestamptz
)
language plpgsql stable security definer set search_path = pg_catalog, public
as $$
declare actor_id uuid := actor_profile_id; actor_role public.app_role;
begin
  select role into actor_role from public.profiles where id = actor_id;
  if actor_role = 'patient' then
    return query select n.id, n.appointment_id, n.version_number, n.supersedes_note_id, n.released_at, n.created_at
    from public.session_notes n join public.appointments a on a.id = n.appointment_id
    where a.patient_id = actor_id and n.released_at is not null
      and not exists (select 1 from public.session_notes newer where newer.appointment_id = n.appointment_id and newer.version_number > n.version_number);
  elsif actor_role = 'psychiatrist' then
    return query select n.id, n.appointment_id, n.version_number, n.supersedes_note_id, n.released_at, n.created_at
    from public.session_notes n join public.appointments a on a.id = n.appointment_id
      join public.psychiatrists p on p.id = a.psychiatrist_id
    where p.profile_id = actor_id;
  end if;
end;
$$;
revoke all on function public.get_my_session_notes(uuid) from public, anon, authenticated;
grant execute on function public.get_my_session_notes(uuid) to service_role;
