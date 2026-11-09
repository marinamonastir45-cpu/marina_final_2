-- ============================================================
-- FIX INVOICES, PAYMENTS & CHANNELS
-- ============================================================

-- 1. Invoices missing columns
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issued_at date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;
UPDATE public.invoices SET issued_at = COALESCE(issued_at, issue_date, created_at::date, CURRENT_DATE);
UPDATE public.invoices SET amount = COALESCE(amount, total, 0);

-- 2. Payments missing column
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE public.payments SET updated_at = COALESCE(updated_at, paid_at, created_at, now());

-- 3. Channel Connections (Booking.com, Airbnb, Expedia)
INSERT INTO public.channel_connections (channel_id, status)
VALUES 
  ('booking_com', 'not_connected'),
  ('airbnb', 'not_connected'),
  ('expedia', 'not_connected')
ON CONFLICT (channel_id) DO NOTHING;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
