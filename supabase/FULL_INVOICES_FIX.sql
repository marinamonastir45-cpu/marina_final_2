-- ============================================================
-- 100% FIX FOR INVOICES, PAYMENTS, CHANNELS & RLS POLICIES
-- ============================================================

-- 1. Enable full access policies for invoices, payments, channel_connections
DROP POLICY IF EXISTS "invoices_all" ON public.invoices;
CREATE POLICY "invoices_all" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "invoice_items_all" ON public.invoice_items;
CREATE POLICY "invoice_items_all" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "payments_all" ON public.payments;
CREATE POLICY "payments_all" ON public.payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "channel_connections_all" ON public.channel_connections;
CREATE POLICY "channel_connections_all" ON public.channel_connections FOR ALL USING (true) WITH CHECK (true);

-- 2. Ensure missing columns exist on invoices and payments
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issued_at date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;
ALTER TABLE public.invoices ALTER COLUMN due_date DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN subtotal DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN total DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN issue_date DROP NOT NULL;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Seed 10 Invoices matching the 10 reservations
INSERT INTO public.invoices (
  id, reservation_id, invoice_number, issued_at, issue_date, due_date, status,
  amount, subtotal, tax_rate, tax_amount, total, paid_amount
) VALUES 
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'FAC-2026-0001', '2026-08-01', '2026-08-01', '2026-08-07', 'issued', 638.4, 570, 0.12, 68.4, 638.4, 191.52),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'FAC-2026-0002', '2026-08-03', '2026-08-03', '2026-08-08', 'paid', 672, 600, 0.12, 72, 672, 672),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'FAC-2026-0003', '2026-08-05', '2026-08-05', '2026-08-10', 'paid', 476, 425, 0.12, 51, 476, 476),
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 'FAC-2026-0004', '2026-08-07', '2026-08-07', '2026-08-14', 'issued', 1254.4, 1120, 0.12, 134.4, 1254.4, 376.32),
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005', 'FAC-2026-0005', '2026-08-10', '2026-08-10', '2026-08-15', 'issued', 672, 600, 0.12, 72, 672, 0),
  ('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000006', 'FAC-2026-0006', '2026-08-12', '2026-08-12', '2026-08-16', 'issued', 380.8, 340, 0.12, 40.8, 380.8, 114.24),
  ('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000007', 'FAC-2026-0007', '2026-08-15', '2026-08-15', '2026-08-20', 'paid', 532, 475, 0.12, 57, 532, 532),
  ('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000008', 'FAC-2026-0008', '2026-08-18', '2026-08-18', '2026-08-25', 'issued', 1254.4, 1120, 0.12, 134.4, 1254.4, 376.32),
  ('d1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000009', 'FAC-2026-0009', '2026-08-22', '2026-08-22', '2026-08-27', 'paid', 672, 600, 0.12, 72, 672, 672),
  ('d1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000010', 'FAC-2026-0010', '2026-08-25', '2026-08-25', '2026-08-30', 'issued', 476, 425, 0.12, 51, 476, 142.8)
ON CONFLICT (id) DO UPDATE SET 
  issued_at = EXCLUDED.issued_at,
  amount = EXCLUDED.amount,
  status = EXCLUDED.status;

-- 4. Seed Payments matching the reservations
INSERT INTO public.payments (id, reservation_id, invoice_id, amount, currency, method, status, paid_at, updated_at)
VALUES 
  ('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 191.52, 'TND', 'card', 'paid', '2026-08-01 14:00:00+00', '2026-08-01 14:00:00+00'),
  ('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 672, 'TND', 'card', 'paid', '2026-08-03 14:00:00+00', '2026-08-03 14:00:00+00'),
  ('e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', 476, 'TND', 'card', 'paid', '2026-08-05 14:00:00+00', '2026-08-05 14:00:00+00'),
  ('e1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', 376.32, 'TND', 'card', 'paid', '2026-08-07 14:00:00+00', '2026-08-07 14:00:00+00'),
  ('e1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000006', 114.24, 'TND', 'card', 'paid', '2026-08-12 14:00:00+00', '2026-08-12 14:00:00+00'),
  ('e1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000007', 532, 'TND', 'card', 'paid', '2026-08-15 14:00:00+00', '2026-08-15 14:00:00+00'),
  ('e1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000008', 376.32, 'TND', 'card', 'paid', '2026-08-18 14:00:00+00', '2026-08-18 14:00:00+00'),
  ('e1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000009', 672, 'TND', 'card', 'paid', '2026-08-22 14:00:00+00', '2026-08-22 14:00:00+00'),
  ('e1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000010', 142.8, 'TND', 'card', 'paid', '2026-08-25 14:00:00+00', '2026-08-25 14:00:00+00')
ON CONFLICT (id) DO UPDATE SET 
  updated_at = EXCLUDED.updated_at,
  status = EXCLUDED.status;

-- 5. Channels
INSERT INTO public.channel_connections (channel_id, status)
VALUES 
  ('booking_com', 'not_connected'),
  ('airbnb', 'not_connected'),
  ('expedia', 'not_connected')
ON CONFLICT (channel_id) DO NOTHING;

-- 6. Reload schema
NOTIFY pgrst, 'reload schema';
