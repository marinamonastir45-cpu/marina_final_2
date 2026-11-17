-- Update create_client_reservation to insert reservations directly with 'confirmed' status
-- per hotel management requirement: bookings for studios and apartments are confirmed immediately.

create or replace function public.create_client_reservation(
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_phone text default null,
  p_country text default null,
  p_cin_passport text default null,
  p_special_requests text default null
)
returns table (
  reservation_id uuid,
  reservation_number text,
  total numeric,
  deposit numeric,
  remaining_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := auth.uid();
  v_profile public.profiles;
  v_room public.room_types;
  v_nights integer;
  v_min_nights integer;
  v_room_price numeric;
  v_tax_rate numeric;
  v_taxes numeric;
  v_total numeric;
  v_reservation_id uuid;
  v_reservation_number text;
begin
  if v_client_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile from public.profiles where id = v_client_id;
  if not found or v_profile.role <> 'client' then
    raise exception 'A client account is required to book';
  end if;

  if p_check_in is null or p_check_out is null or p_check_in >= p_check_out then
    raise exception 'Invalid stay dates';
  end if;

  select *
  into v_room
  from public.room_types
  where id = p_room_type_id
    and status = 'active';

  if not found then
    raise exception 'Room type not found';
  end if;

  v_nights := (p_check_out - p_check_in);

  if coalesce(p_adults, 0) + coalesce(p_children, 0) > v_room.capacity_adults + v_room.capacity_children then
    raise exception 'Guest count exceeds room capacity';
  end if;

  select coalesce(max(min_nights), 1)
  into v_min_nights
  from (
    select c.min_nights
    from public.room_rate_calendar c
    where c.room_type_id = p_room_type_id
      and c.date >= p_check_in
      and c.date < p_check_out
    union all
    select p.min_nights
    from public.room_date_prices p
    where p.room_id = p_room_type_id
      and p.date >= p_check_in
      and p.date < p_check_out
      and not exists (
        select 1
        from public.room_rate_calendar c
        where c.room_type_id = p.room_id
          and c.date = p.date
      )
    union all
    select r.min_nights
    from public.room_date_rates r
    where r.room_id = p_room_type_id
      and r.date >= p_check_in
      and r.date < p_check_out
      and not exists (
        select 1
        from public.room_rate_calendar c
        where c.room_type_id = r.room_id
          and c.date = r.date
      )
      and not exists (
        select 1
        from public.room_date_prices p
        where p.room_id = r.room_id
          and p.date = r.date
      )
  ) rates;

  if v_nights < coalesce(v_min_nights, 1) then
    raise exception 'Minimum stay is % nights', v_min_nights;
  end if;

  if public.get_available_units(p_room_type_id, p_check_in, p_check_out) <= 0 then
    raise exception 'No available units for requested dates';
  end if;

  select coalesce(tax_rate, 0.12)
  into v_tax_rate
  from public.hotel_settings
  order by created_at asc
  limit 1;

  v_tax_rate := coalesce(v_tax_rate, 0.12);

  select coalesce(sum(coalesce(c.price, p.price, r.price, v_room.price_per_night)), 0)
  into v_room_price
  from generate_series(p_check_in, p_check_out - 1, interval '1 day') as d(day)
  left join public.room_rate_calendar c
    on c.room_type_id = p_room_type_id
   and c.date = d.day::date
  left join public.room_date_prices p
    on p.room_id = p_room_type_id
   and p.date = d.day::date
  left join public.room_date_rates r
    on r.room_id = p_room_type_id
   and r.date = d.day::date;

  v_taxes := round(v_room_price * v_tax_rate);
  v_total := v_room_price + v_taxes;
  v_reservation_number := 'MCM-' || extract(year from now())::int || '-' ||
    lpad(((select count(*) + 1 from public.reservations)::text), 3, '0');

  insert into public.guests (id, full_name, email, phone, country, identity_number)
  values (
    v_client_id,
    coalesce(v_profile.full_name, v_profile.email, 'Client'),
    v_profile.email,
    nullif(trim(coalesce(p_phone, '')), ''),
    coalesce(nullif(trim(coalesce(p_country, '')), ''), 'Tunisie'),
    nullif(trim(coalesce(p_cin_passport, '')), '')
  )
  on conflict (id) do update
  set
    full_name = coalesce(public.guests.full_name, excluded.full_name),
    email = coalesce(excluded.email, public.guests.email),
    phone = coalesce(excluded.phone, public.guests.phone),
    country = coalesce(excluded.country, public.guests.country),
    identity_number = coalesce(excluded.identity_number, public.guests.identity_number);

  insert into public.reservations (
    reservation_number,
    room_type_id,
    guest_id,
    check_in,
    check_out,
    adults,
    children,
    status,
    payment_status,
    source,
    special_requests,
    nights,
    room_price,
    taxes_and_fees,
    deposit,
    total,
    paid_amount,
    remaining_amount
  )
  values (
    v_reservation_number,
    p_room_type_id,
    v_client_id,
    p_check_in,
    p_check_out,
    coalesce(p_adults, 1),
    coalesce(p_children, 0),
    'confirmed',
    'unpaid',
    'direct',
    nullif(trim(coalesce(p_special_requests, '')), ''),
    v_nights,
    v_room_price,
    v_taxes,
    0,
    v_total,
    0,
    v_total
  )
  returning id into v_reservation_id;

  return query select v_reservation_id, v_reservation_number, v_total, 0::numeric, v_total;
end;
$$;

grant execute on function public.create_client_reservation(
  uuid, date, date, integer, integer, text, text, text, text
) to authenticated;
