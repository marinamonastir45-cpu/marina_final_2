-- ==============================================================================
-- MARINA CAP MONASTIR - FULL DATABASE REPLICATION & SETUP SCRIPT
-- For New Supabase Project (100% Complete & Self-Contained)
-- Instructions: Paste this entire script into your new Supabase SQL Editor and click RUN.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. HOTEL SETTINGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hotel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_name text NOT NULL DEFAULT 'Marina Cap Monastir',
  logo_url text,
  hero_url text,
  phone text DEFAULT '(+216) 73 46 23 05',
  fax text DEFAULT '(+216) 73 46 49 97',
  email text DEFAULT 'reservation@marinamonastir.tn',
  marketing_email text DEFAULT 'marketing@marinamonastir.tn',
  capitainerie_email text DEFAULT 'capitainerie@marinamonastir.tn',
  capitainerie_phones text[] DEFAULT ARRAY['(+216) 73 46 23 05', '(+216) 73 46 20 66'],
  address text DEFAULT 'BP.N°60 - 5000 Monastir - Tunisie',
  tax_registration text DEFAULT 'MF 0000000/A/M/000',
  invoice_prefix text DEFAULT 'MCM',
  default_currency text DEFAULT 'TND',
  check_in_time text DEFAULT '14:00',
  check_out_time text DEFAULT '11:00',
  tax_rate numeric DEFAULT 0.12,
  deposit_percentage numeric DEFAULT 0.30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==============================================================================
-- 2. USER PROFILES & AUTHENTICATION
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'owner', 'client', 'capitainerie')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(lower(email));

CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  full_name text,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'receptionist',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_id text,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Helper security functions
CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_profile_role() IN ('admin', 'owner'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_or_owner();
$$;

CREATE OR REPLACE FUNCTION public.is_port_tariff_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.is_admin_or_owner() OR public.current_profile_role() = 'capitainerie', false);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
BEGIN
  requested_role := COALESCE(new.raw_user_meta_data->>'role', 'client');
  IF requested_role NOT IN ('admin', 'owner', 'client', 'capitainerie') THEN
    requested_role := 'client';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.email,
    requested_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ==============================================================================
-- 3. ROOM TYPES, AMENITIES, IMAGES & UNITS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  price_per_night numeric NOT NULL,
  capacity_adults integer NOT NULL,
  capacity_children integer NOT NULL DEFAULT 0,
  beds text NOT NULL,
  bathrooms integer NOT NULL DEFAULT 1,
  total_units integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.room_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  url text NOT NULL,
  image_url text,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.room_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  amenity text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.room_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz DEFAULT now(),
  UNIQUE (room_type_id, unit_number)
);

-- ==============================================================================
-- 4. GUESTS & RESERVATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  first_name text,
  last_name text,
  email text NOT NULL,
  phone text,
  country text,
  nationality text,
  identity_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS guests_email_idx ON public.guests(lower(email));

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number text NOT NULL UNIQUE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE RESTRICT,
  room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE RESTRICT,
  unit_id uuid REFERENCES public.room_units(id) ON DELETE SET NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  adults integer NOT NULL DEFAULT 1,
  children integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  source text NOT NULL DEFAULT 'direct',
  special_requests text,
  nights integer NOT NULL DEFAULT 1,
  room_price numeric NOT NULL DEFAULT 0,
  taxes_and_fees numeric NOT NULL DEFAULT 0,
  deposit numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservations_guest_id_idx ON public.reservations(guest_id);
CREATE INDEX IF NOT EXISTS reservations_room_type_dates_idx ON public.reservations(room_type_id, check_in, check_out);

-- ==============================================================================
-- 5. ROOM CALENDAR, RATES & AVAILABILITY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.room_date_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  room_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  date date NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  availability_status text NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'partially_reserved', 'reserved', 'maintenance', 'closed')),
  min_nights integer NOT NULL DEFAULT 1 CHECK (min_nights >= 1),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, date)
);

CREATE TABLE IF NOT EXISTS public.room_date_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  room_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  date date NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  availability_status text NOT NULL DEFAULT 'available',
  min_nights integer NOT NULL DEFAULT 1,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (room_id, date)
);

CREATE TABLE IF NOT EXISTS public.room_rate_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'available',
  price numeric NOT NULL,
  min_nights integer NOT NULL DEFAULT 1,
  inventory_mode text NOT NULL DEFAULT 'auto',
  units_available_override integer,
  selected_unit_ids text[],
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_type_id, date)
);

CREATE TABLE IF NOT EXISTS public.room_availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'not_available',
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==============================================================================
-- 6. PORT DE PLAISANCE (TARIFFS, BERTHS & BOAT STAYS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.port_tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  length_min numeric,
  length_max numeric,
  daily_price numeric,
  monthly_price numeric,
  yearly_price numeric,
  wintering_price numeric,
  currency text NOT NULL DEFAULT 'TND',
  note text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS port_tariffs_active_sort_idx ON public.port_tariffs(active, sort_order);

CREATE TABLE IF NOT EXISTS public.port_berths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  berth_number text NOT NULL UNIQUE,
  basin text NOT NULL DEFAULT 'A',
  max_length numeric NOT NULL DEFAULT 20,
  max_width numeric NOT NULL DEFAULT 6,
  max_draught numeric NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.boat_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  berth_id uuid REFERENCES public.port_berths(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  reservation_number text,
  boat_name text NOT NULL,
  boat_registration text,
  flag text,
  boat_type text,
  boat_length numeric,
  boat_width numeric,
  boat_draught numeric,
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  arrival_at timestamptz,
  departure_at timestamptz,
  status text NOT NULL DEFAULT 'expected',
  source text NOT NULL DEFAULT 'direct',
  deposit_amount numeric DEFAULT 0,
  deposit_currency text DEFAULT 'TND',
  total numeric DEFAULT 0,
  special_requirements text,
  newsletter boolean DEFAULT false,
  owner_full_name text,
  owner_phone text,
  owner_email text,
  nationality text,
  length numeric,
  width numeric,
  draught numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.port_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_stay_id uuid REFERENCES public.boat_stays(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 7. MESSAGING & CONVERSATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_sender_created_idx ON public.messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_receiver_read_idx ON public.messages(receiver_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_pair_created_idx ON public.messages(sender_id, receiver_id, created_at);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id text,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT 'General',
  status text NOT NULL DEFAULT 'open',
  admin_read_at timestamptz,
  client_read_at timestamptz,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('admin', 'client')),
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.reservation_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('admin', 'client')),
  sender_name text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 8. INVOICES, PAYMENTS & CHANNELS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0.12,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'TND',
  method text NOT NULL DEFAULT 'card',
  status text NOT NULL DEFAULT 'paid',
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.channel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'not_connected',
  api_key_configured boolean NOT NULL DEFAULT false,
  property_id text,
  last_sync_at timestamptz,
  auto_sync boolean NOT NULL DEFAULT true,
  sync_rates boolean NOT NULL DEFAULT true,
  sync_availability boolean NOT NULL DEFAULT true,
  sync_restrictions boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.channel_room_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL REFERENCES public.channel_connections(channel_id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  external_room_id text NOT NULL,
  sync_status text NOT NULL DEFAULT 'synced',
  rate_multiplier numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL,
  direction text NOT NULL DEFAULT 'pull',
  status text NOT NULL DEFAULT 'success',
  message text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  read boolean NOT NULL DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now()
);

-- ==============================================================================
-- 9. RPC STORED PROCEDURES (BUSINESS LOGIC)
-- ==============================================================================

-- Function 1: Check available units for date range
CREATE OR REPLACE FUNCTION public.get_available_units(
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_units integer;
  v_max_occupied integer := 0;
BEGIN
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_in >= p_check_out THEN
    RETURN 0;
  END IF;

  SELECT total_units INTO v_total_units
  FROM public.room_types
  WHERE id = p_room_type_id AND status = 'active';

  IF v_total_units IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(MAX(occupied), 0)
  INTO v_max_occupied
  FROM (
    SELECT d.day::date, COUNT(r.id) AS occupied
    FROM generate_series(p_check_in, p_check_out - interval '1 day', interval '1 day') AS d(day)
    LEFT JOIN public.reservations r
      ON r.room_type_id = p_room_type_id
     AND r.status IN ('confirmed', 'pending', 'checked_in')
     AND r.check_in <= d.day::date
     AND r.check_out > d.day::date
    GROUP BY d.day::date
  ) sub;

  RETURN GREATEST(0, v_total_units - v_max_occupied);
END;
$$;

-- Function 2: Create authenticated client reservation
CREATE OR REPLACE FUNCTION public.create_client_reservation(
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_phone text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_cin_passport text DEFAULT NULL,
  p_special_requests text DEFAULT NULL
)
RETURNS table (
  reservation_id uuid,
  reservation_number text,
  total numeric,
  deposit numeric,
  remaining_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid := auth.uid();
  v_profile public.profiles;
  v_room public.room_types;
  v_nights integer;
  v_room_price numeric := 0;
  v_tax_rate numeric := 0.12;
  v_taxes numeric := 0;
  v_total numeric := 0;
  v_deposit numeric := 0;
  v_reservation_id uuid;
  v_reservation_number text;
  v_guest_id uuid;
BEGIN
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_client_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client profile not found';
  END IF;

  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_in >= p_check_out THEN
    RAISE EXCEPTION 'Invalid stay dates';
  END IF;

  SELECT * INTO v_room FROM public.room_types WHERE id = p_room_type_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room type not found';
  END IF;

  IF public.get_available_units(p_room_type_id, p_check_in, p_check_out) <= 0 THEN
    RAISE EXCEPTION 'No available units for requested dates';
  END IF;

  v_nights := (p_check_out - p_check_in);

  -- Calculate price
  SELECT COALESCE(SUM(COALESCE(r.price, v_room.price_per_night)), 0)
  INTO v_room_price
  FROM generate_series(p_check_in, p_check_out - interval '1 day', interval '1 day') AS d(day)
  LEFT JOIN public.room_date_rates r
    ON r.room_id = p_room_type_id
   AND r.date = d.day::date;

  SELECT COALESCE(tax_rate, 0.12) INTO v_tax_rate FROM public.hotel_settings LIMIT 1;
  v_taxes := round(v_room_price * COALESCE(v_tax_rate, 0.12));
  v_total := v_room_price + v_taxes;
  v_deposit := round(v_total * 0.30);

  -- Link or create guest entry
  SELECT id INTO v_guest_id FROM public.guests WHERE email = v_profile.email LIMIT 1;
  IF v_guest_id IS NULL THEN
    INSERT INTO public.guests (full_name, email, phone, country, identity_number)
    VALUES (COALESCE(v_profile.full_name, 'Client'), v_profile.email, p_phone, p_country, p_cin_passport)
    RETURNING id INTO v_guest_id;
  END IF;

  v_reservation_number := 'MCM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  INSERT INTO public.reservations (
    reservation_number,
    guest_id,
    room_type_id,
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
    remaining_amount
  ) VALUES (
    v_reservation_number,
    v_guest_id,
    p_room_type_id,
    p_check_in,
    p_check_out,
    p_adults,
    p_children,
    'pending',
    'unpaid',
    'direct',
    p_special_requests,
    v_nights,
    v_room_price,
    v_taxes,
    v_deposit,
    v_total,
    v_total - v_deposit
  ) RETURNING id INTO v_reservation_id;

  RETURN QUERY SELECT v_reservation_id, v_reservation_number, v_total, v_deposit, (v_total - v_deposit);
END;
$$;

-- Function 3: Create public reservation
CREATE OR REPLACE FUNCTION public.create_public_reservation(
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_full_name text,
  p_email text,
  p_phone text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_cin_passport text DEFAULT NULL,
  p_special_requests text DEFAULT NULL
)
RETURNS table (
  reservation_id uuid,
  reservation_number text,
  total numeric,
  deposit numeric,
  remaining_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id uuid;
  v_room public.room_types;
  v_nights integer;
  v_room_price numeric := 0;
  v_taxes numeric := 0;
  v_total numeric := 0;
  v_deposit numeric := 0;
  v_reservation_id uuid;
  v_reservation_number text;
BEGIN
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_in >= p_check_out THEN
    RAISE EXCEPTION 'Invalid dates';
  END IF;

  SELECT * INTO v_room FROM public.room_types WHERE id = p_room_type_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room type not found';
  END IF;

  IF public.get_available_units(p_room_type_id, p_check_in, p_check_out) <= 0 THEN
    RAISE EXCEPTION 'No available units';
  END IF;

  v_nights := (p_check_out - p_check_in);

  SELECT COALESCE(SUM(COALESCE(r.price, v_room.price_per_night)), 0)
  INTO v_room_price
  FROM generate_series(p_check_in, p_check_out - interval '1 day', interval '1 day') AS d(day)
  LEFT JOIN public.room_date_rates r
    ON r.room_id = p_room_type_id
   AND r.date = d.day::date;

  v_taxes := round(v_room_price * 0.12);
  v_total := v_room_price + v_taxes;
  v_deposit := round(v_total * 0.30);

  INSERT INTO public.guests (full_name, email, phone, country, identity_number)
  VALUES (p_full_name, p_email, p_phone, p_country, p_cin_passport)
  RETURNING id INTO v_guest_id;

  v_reservation_number := 'MCM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  INSERT INTO public.reservations (
    reservation_number,
    guest_id,
    room_type_id,
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
    remaining_amount
  ) VALUES (
    v_reservation_number,
    v_guest_id,
    p_room_type_id,
    p_check_in,
    p_check_out,
    p_adults,
    p_children,
    'pending',
    'unpaid',
    'direct',
    p_special_requests,
    v_nights,
    v_room_price,
    v_taxes,
    v_deposit,
    v_total,
    v_total - v_deposit
  ) RETURNING id INTO v_reservation_id;

  RETURN QUERY SELECT v_reservation_id, v_reservation_number, v_total, v_deposit, (v_total - v_deposit);
END;
$$;

-- Function 4: Create port reservation RPC
CREATE OR REPLACE FUNCTION public.create_port_reservation(
  p_last_name text,
  p_first_name text,
  p_date_of_birth text,
  p_nationality text,
  p_phone text,
  p_email text,
  p_boat_name text,
  p_flag text,
  p_length numeric,
  p_width numeric,
  p_draught numeric,
  p_boat_type text,
  p_check_in date,
  p_check_out date,
  p_deposit_amount numeric,
  p_deposit_currency text,
  p_special_requirements text DEFAULT NULL,
  p_newsletter boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id uuid;
  v_berth_id uuid;
  v_stay_id uuid;
  v_reservation_number text;
BEGIN
  -- Link or create guest
  SELECT id INTO v_guest_id FROM public.guests WHERE email = p_email LIMIT 1;
  IF v_guest_id IS NULL THEN
    INSERT INTO public.guests (full_name, first_name, last_name, email, phone, nationality)
    VALUES (p_first_name || ' ' || p_last_name, p_first_name, p_last_name, p_email, p_phone, p_nationality)
    RETURNING id INTO v_guest_id;
  END IF;

  -- Select available berth or default
  SELECT id INTO v_berth_id FROM public.port_berths WHERE status = 'available' LIMIT 1;

  v_reservation_number := 'PORT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  INSERT INTO public.boat_stays (
    berth_id,
    guest_id,
    reservation_number,
    boat_name,
    flag,
    boat_type,
    boat_length,
    boat_width,
    boat_draught,
    arrival_date,
    departure_date,
    deposit_amount,
    deposit_currency,
    special_requirements,
    newsletter,
    owner_full_name,
    owner_phone,
    owner_email,
    nationality,
    length,
    width,
    draught,
    status
  ) VALUES (
    v_berth_id,
    v_guest_id,
    v_reservation_number,
    p_boat_name,
    p_flag,
    p_boat_type,
    p_length,
    p_width,
    p_draught,
    p_check_in,
    p_check_out,
    p_deposit_amount,
    p_deposit_currency,
    p_special_requirements,
    p_newsletter,
    p_first_name || ' ' || p_last_name,
    p_phone,
    p_email,
    p_nationality,
    p_length,
    p_width,
    p_draught,
    'expected'
  ) RETURNING id INTO v_stay_id;

  RETURN jsonb_build_object(
    'reservation_id', v_stay_id,
    'reservation_number', v_reservation_number
  );
END;
$$;

-- Function 5: Link guest reservations to client upon signup
CREATE OR REPLACE FUNCTION public.link_guest_reservations_to_client(
  p_client_id uuid,
  p_email text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.reservations r
  SET guest_id = p_client_id
  FROM public.guests g
  WHERE r.guest_id = g.id
    AND lower(g.email) = lower(p_email)
    AND r.guest_id <> p_client_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- ==============================================================================
ALTER TABLE public.hotel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_date_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_date_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_rate_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.port_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.port_berths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boat_stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Public read policies for storefront
CREATE POLICY "hotel_settings_public_read" ON public.hotel_settings FOR SELECT USING (true);
CREATE POLICY "room_types_public_read" ON public.room_types FOR SELECT USING (true);
CREATE POLICY "room_images_public_read" ON public.room_images FOR SELECT USING (true);
CREATE POLICY "room_amenities_public_read" ON public.room_amenities FOR SELECT USING (true);
CREATE POLICY "room_units_public_read" ON public.room_units FOR SELECT USING (true);
CREATE POLICY "room_date_rates_public_read" ON public.room_date_rates FOR SELECT USING (true);
CREATE POLICY "room_date_prices_public_read" ON public.room_date_prices FOR SELECT USING (true);
CREATE POLICY "room_rate_calendar_public_read" ON public.room_rate_calendar FOR SELECT USING (true);
CREATE POLICY "port_tariffs_public_read" ON public.port_tariffs FOR SELECT USING (true);
CREATE POLICY "port_berths_public_read" ON public.port_berths FOR SELECT USING (true);

-- Authenticated and Admin policies
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.is_admin_or_owner());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid() OR public.is_admin_or_owner());

CREATE POLICY "messages_all_access" ON public.messages FOR ALL USING (
  sender_id = auth.uid() OR receiver_id = auth.uid() OR public.is_admin_or_owner()
);

CREATE POLICY "reservations_select" ON public.reservations FOR SELECT USING (
  guest_id = auth.uid() OR public.is_admin_or_owner()
);
CREATE POLICY "reservations_admin_all" ON public.reservations FOR ALL USING (public.is_admin_or_owner());

CREATE POLICY "guests_admin_all" ON public.guests FOR ALL USING (public.is_admin_or_owner());
CREATE POLICY "port_tariffs_manager" ON public.port_tariffs FOR ALL USING (public.is_port_tariff_manager());
CREATE POLICY "boat_stays_admin_all" ON public.boat_stays FOR ALL USING (public.is_admin_or_owner());

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- ==============================================================================
-- 11. SEED DATA (REAL ROOMS, AMENITIES, SETTINGS & TARIFFS)
-- ==============================================================================

-- 11.1 Hotel Settings
INSERT INTO public.hotel_settings (
  hotel_name, phone, fax, email, marketing_email, capitainerie_email,
  capitainerie_phones, address, tax_registration, invoice_prefix, default_currency,
  check_in_time, check_out_time, tax_rate, deposit_percentage
) VALUES (
  'Marina Cap Monastir',
  '(+216) 73 46 23 05',
  '(+216) 73 46 49 97',
  'reservation@marinamonastir.tn',
  'marketing@marinamonastir.tn',
  'capitainerie@marinamonastir.tn',
  ARRAY['(+216) 73 46 23 05', '(+216) 73 46 20 66'],
  'BP.N°60 - 5000 Monastir - Tunisie',
  'MF 0000000/A/M/000',
  'MCM',
  'TND',
  '14:00',
  '11:00',
  0.12,
  0.30
)
ON CONFLICT (id) DO NOTHING;

-- 11.2 Room Types (Studio, Économique S+1, Standard S+1, S+2)
INSERT INTO public.room_types (
  id, slug, name, type, description, price_per_night,
  capacity_adults, capacity_children, beds, bathrooms, total_units, status
) VALUES 
  (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'studio',
    'Studio',
    'Studio',
    'Studio fonctionnel pour deux personnes au cœur de Marina Cap Monastir, avec terrasse, kitchenette et confort essentiel pour un séjour en bord de Méditerranée.',
    85, 2, 0,
    '1 lit double ou 2 lits simples', 1, 36, 'active'
  ),
  (
    'be47c5a0-5915-4e45-a355-bcda4a85bb5b',
    'appartement-economique-s1',
    'Appartement Économique S+1',
    'Appartement',
    'Appartement S+1 simple et pratique pour quatre personnes, idéal pour profiter du port avec kitchenette, climatisation et vue ou entrée côté port.',
    95, 4, 0,
    '2 lits simples + 1 canapé-lit', 1, 32, 'active'
  ),
  (
    'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    'appartement-standard-s1',
    'Appartement Standard S+1',
    'Appartement',
    'Appartement S+1 confortable avec terrasse et vue sur le port, pensé pour les séjours en famille ou entre amis à Marina Cap Monastir.',
    110, 4, 0,
    '1 lit double ou 2 lits simples + 1 canapé-lit', 1, 34, 'active'
  ),
  (
    'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
    'appartement-s2',
    'Appartement S+2',
    'Appartement',
    'Appartement spacieux pour six personnes avec deux espaces nuit, kitchenette et terrasse, adapté aux familles qui souhaitent séjourner directement sur la marina.',
    140, 6, 0,
    '2 lits simples + 1 lit double + 1 canapé-lit', 1, 18, 'active'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  price_per_night = EXCLUDED.price_per_night,
  total_units = EXCLUDED.total_units,
  status = 'active';

-- 11.3 Room Images
INSERT INTO public.room_images (room_type_id, url, alt_text, sort_order)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '/images/rooms/studio.jpg', 'Studio Marina Cap Monastir', 1),
  ('be47c5a0-5915-4e45-a355-bcda4a85bb5b', '/images/rooms/appartement-economique-s1.jpg', 'Appartement Économique S+1 Marina Cap Monastir', 1),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', '/images/rooms/appartement-standard-s1.jpg', 'Appartement Standard S+1 Marina Cap Monastir', 1),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', '/images/rooms/appartement-s2.jpg', 'Appartement S+2 Marina Cap Monastir', 1)
ON CONFLICT DO NOTHING;

-- 11.4 Room Amenities
INSERT INTO public.room_amenities (room_type_id, amenity) VALUES
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Terrasse'),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Télévision à écran plat'),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Climatisation'),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Kitchenette'),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Wi-Fi gratuit'),

  ('be47c5a0-5915-4e45-a355-bcda4a85bb5b', 'Télévision à écran plat'),
  ('be47c5a0-5915-4e45-a355-bcda4a85bb5b', 'Climatisation'),
  ('be47c5a0-5915-4e45-a355-bcda4a85bb5b', 'Vue port'),
  ('be47c5a0-5915-4e45-a355-bcda4a85bb5b', 'Kitchenette'),
  ('be47c5a0-5915-4e45-a355-bcda4a85bb5b', 'Wi-Fi gratuit'),

  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Terrasse'),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Télévision à écran plat'),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Climatisation'),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Vue port'),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Kitchenette'),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Wi-Fi gratuit'),

  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Terrasse'),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Télévision à écran plat'),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Climatisation'),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Kitchenette'),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Wi-Fi gratuit')
ON CONFLICT DO NOTHING;

-- 11.5 Room Units
INSERT INTO public.room_units (room_type_id, unit_number, status)
SELECT 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'ST-' || lpad(series::text, 3, '0'), 'available'
FROM generate_series(1, 36) AS series
ON CONFLICT DO NOTHING;

INSERT INTO public.room_units (room_type_id, unit_number, status)
SELECT 'be47c5a0-5915-4e45-a355-bcda4a85bb5b', 'ECO-' || lpad(series::text, 3, '0'), 'available'
FROM generate_series(1, 32) AS series
ON CONFLICT DO NOTHING;

INSERT INTO public.room_units (room_type_id, unit_number, status)
SELECT 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'STD-' || lpad(series::text, 3, '0'), 'available'
FROM generate_series(1, 34) AS series
ON CONFLICT DO NOTHING;

INSERT INTO public.room_units (room_type_id, unit_number, status)
SELECT 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'S2-' || lpad(series::text, 3, '0'), 'available'
FROM generate_series(1, 18) AS series
ON CONFLICT DO NOTHING;

-- 11.6 Port Tariffs
INSERT INTO public.port_tariffs (category, length_max, daily_price, monthly_price, yearly_price, currency, sort_order)
VALUES
  ('Jusqu''à 7,49 m', 7.49, 30, 400, 2200, 'TND', 1),
  ('7,5 m à 8,49 m', 8.49, 35, 450, 2400, 'TND', 2),
  ('8,5 m à 9,49 m', 9.49, 40, 500, 2800, 'TND', 3),
  ('9,5 m à 10,49 m', 10.49, 45, 600, 3500, 'TND', 4),
  ('10,5 m à 11,49 m', 11.49, 50, 700, 3800, 'TND', 5),
  ('11,5 m à 12,49 m', 12.49, 60, 800, 4200, 'TND', 6),
  ('12,5 m à 13,49 m', 13.49, 65, 900, 4800, 'TND', 7),
  ('13,5 m à 14,49 m', 14.49, 75, 1000, 5700, 'TND', 8),
  ('14,5 m à 15,49 m', 15.49, 90, 1100, 6100, 'TND', 9),
  ('15,5 m à 16,49 m', 16.49, 100, 1200, 7000, 'TND', 10),
  ('16,5 m à 17,49 m', 17.49, 110, 1300, 7500, 'TND', 11),
  ('17,5 m à 18,49 m', 18.49, 125, 1500, 8500, 'TND', 12),
  ('18,5 m à 19,49 m', 19.49, 150, 2000, 9500, 'TND', 13),
  ('19,5 m à 20,49 m', 20.49, 170, 2500, 11500, 'TND', 14),
  ('20,5 m à 25,00 m', 25.00, 200, 3000, 12500, 'TND', 15),
  ('25,01 m à 30,00 m', 30.00, 300, 3500, 16500, 'TND', 16),
  ('Plus de 30 m', NULL, 400, 4000, 19000, 'TND', 17)
ON CONFLICT DO NOTHING;

-- 11.7 Port Berths
INSERT INTO public.port_berths (berth_number, basin, max_length, max_width, max_draught, status)
VALUES
  ('B-01', 'A', 15.0, 4.5, 2.8, 'available'),
  ('B-02', 'A', 18.0, 5.0, 3.0, 'available'),
  ('B-03', 'A', 22.0, 6.0, 3.2, 'available'),
  ('B-04', 'B', 12.0, 4.0, 2.5, 'available'),
  ('B-05', 'B', 10.0, 3.5, 2.2, 'available'),
  ('B-06', 'B', 25.0, 7.0, 3.5, 'available'),
  ('B-07', 'C', 30.0, 8.0, 4.0, 'available')
ON CONFLICT (berth_number) DO NOTHING;
