-- ============================================================
-- SEED COMPLETE TEST DATA: GUESTS, RESERVATIONS, INVOICES, PAYMENTS
-- Populates the admin dashboard with realistic rich data
-- ============================================================

-- 1. Guests (10 realistic guests)
INSERT INTO public.guests (id, full_name, email, phone, country, cin_passport)
VALUES ('b1000000-0000-0000-0000-000000000001', 'Sophie Martin', 'sophie.martin@example.com', '+33 6 10 20 30 40', 'France', 'FR123456')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;
INSERT INTO public.guests (id, full_name, email, phone, country, cin_passport)
VALUES ('b1000000-0000-0000-0000-000000000002', 'Karim Ben Ali', 'karim.benali@example.tn', '+216 98 111 222', 'Tunisie', 'TN987654')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;
INSERT INTO public.guests (id, full_name, email, phone, country, cin_passport)
VALUES ('b1000000-0000-0000-0000-000000000003', 'Thomas Dubois', 'thomas.dubois@example.fr', '+33 6 55 44 33 22', 'France', 'FR654321')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;
INSERT INTO public.guests (id, full_name, email, phone, country, cin_passport)
VALUES ('b1000000-0000-0000-0000-000000000004', 'Elena Rossi', 'elena.rossi@example.it', '+39 340 123 4567', 'Italie', 'IT789123')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;
INSERT INTO public.guests (id, full_name, email, phone, country, cin_passport)
VALUES ('b1000000-0000-0000-0000-000000000005', 'Lucas Bernard', 'lucas.bernard@example.com', '+33 7 88 99 00 11', 'France', 'FR456789')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;
INSERT INTO public.guests (id, full_name, email, phone, country, cin_passport)
VALUES ('b1000000-0000-0000-0000-000000000006', 'Sarah Jenkins', 'sarah.jenkins@example.co.uk', '+44 7700 900123', 'Royaume-Uni', 'UK123987')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;
INSERT INTO public.guests (id, full_name, email, phone, country, cin_passport)
VALUES ('b1000000-0000-0000-0000-000000000007', 'Mehdi Trabelsi', 'mehdi.trabelsi@example.tn', '+216 22 333 444', 'Tunisie', 'TN112233')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;
INSERT INTO public.guests (id, full_name, email, phone, country, cin_passport)
VALUES ('b1000000-0000-0000-0000-000000000008', 'Claire Dupont', 'claire.dupont@example.fr', '+33 6 12 34 56 78', 'France', 'FR321654')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;
INSERT INTO public.guests (id, full_name, email, phone, country, cin_passport)
VALUES ('b1000000-0000-0000-0000-000000000009', 'Youssef Mansour', 'youssef.mansour@example.tn', '+216 55 666 777', 'Tunisie', 'TN445566')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;
INSERT INTO public.guests (id, full_name, email, phone, country, cin_passport)
VALUES ('b1000000-0000-0000-0000-000000000010', 'Anna Schmidt', 'anna.schmidt@example.de', '+49 151 2345678', 'Allemagne', 'DE987123')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

-- 2. Reservations (10 reservations linked to real room types)
INSERT INTO public.reservations (
  id, reservation_number, guest_id, room_type_id, check_in, check_out,
  adults, children, status, payment_status, source, special_requests,
  nights, room_price, taxes_and_fees, deposit, total, paid_amount, remaining_amount
) VALUES (
  'c1000000-0000-0000-0000-000000000001', 'MCM-2026-001', 'b1000000-0000-0000-0000-000000000001', 'be47c5a0-5915-4e45-a355-bcda4a85bb5b', '2026-08-01', '2026-08-07',
  2, 0, 'confirmed', 'deposit_paid', 'booking_com', 'Arrivée prévue vers 18h.',
  6, 570, 68.4, 191.52, 638.4, 191.52, 446.88
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status;
INSERT INTO public.reservations (
  id, reservation_number, guest_id, room_type_id, check_in, check_out,
  adults, children, status, payment_status, source, special_requests,
  nights, room_price, taxes_and_fees, deposit, total, paid_amount, remaining_amount
) VALUES (
  'c1000000-0000-0000-0000-000000000002', 'MCM-2026-002', 'b1000000-0000-0000-0000-000000000002', 'ce47c5a0-5915-4e45-a355-bcda4a85bb5c', '2026-08-03', '2026-08-08',
  2, 1, 'confirmed', 'paid', 'direct', 'Lit bébé si possible.',
  5, 600, 72, 201.6, 672, 672, 0
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status;
INSERT INTO public.reservations (
  id, reservation_number, guest_id, room_type_id, check_in, check_out,
  adults, children, status, payment_status, source, special_requests,
  nights, room_price, taxes_and_fees, deposit, total, paid_amount, remaining_amount
) VALUES (
  'c1000000-0000-0000-0000-000000000003', 'MCM-2026-003', 'b1000000-0000-0000-0000-000000000003', 'ae47c5a0-5915-4e45-a355-bcda4a85bb5a', '2026-08-05', '2026-08-10',
  2, 0, 'checked_in', 'paid', 'airbnb', 'Vue mer souhaitée.',
  5, 425, 51, 142.8, 476, 476, 0
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status;
INSERT INTO public.reservations (
  id, reservation_number, guest_id, room_type_id, check_in, check_out,
  adults, children, status, payment_status, source, special_requests,
  nights, room_price, taxes_and_fees, deposit, total, paid_amount, remaining_amount
) VALUES (
  'c1000000-0000-0000-0000-000000000004', 'MCM-2026-004', 'b1000000-0000-0000-0000-000000000004', 'de47c5a0-5915-4e45-a355-bcda4a85bb5d', '2026-08-07', '2026-08-14',
  4, 1, 'confirmed', 'deposit_paid', 'expedia', 'Place de parking.',
  7, 1120, 134.4, 376.32, 1254.4, 376.32, 878.0800000000002
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status;
INSERT INTO public.reservations (
  id, reservation_number, guest_id, room_type_id, check_in, check_out,
  adults, children, status, payment_status, source, special_requests,
  nights, room_price, taxes_and_fees, deposit, total, paid_amount, remaining_amount
) VALUES (
  'c1000000-0000-0000-0000-000000000005', 'MCM-2026-005', 'b1000000-0000-0000-0000-000000000005', 'ce47c5a0-5915-4e45-a355-bcda4a85bb5c', '2026-08-10', '2026-08-15',
  2, 0, 'pending', 'unpaid', 'direct', NULL,
  5, 600, 72, 201.6, 672, 0, 672
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status;
INSERT INTO public.reservations (
  id, reservation_number, guest_id, room_type_id, check_in, check_out,
  adults, children, status, payment_status, source, special_requests,
  nights, room_price, taxes_and_fees, deposit, total, paid_amount, remaining_amount
) VALUES (
  'c1000000-0000-0000-0000-000000000006', 'MCM-2026-006', 'b1000000-0000-0000-0000-000000000006', 'ae47c5a0-5915-4e45-a355-bcda4a85bb5a', '2026-08-12', '2026-08-16',
  1, 0, 'confirmed', 'deposit_paid', 'booking_com', 'Late check-in.',
  4, 340, 40.8, 114.24, 380.8, 114.24, 266.56
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status;
INSERT INTO public.reservations (
  id, reservation_number, guest_id, room_type_id, check_in, check_out,
  adults, children, status, payment_status, source, special_requests,
  nights, room_price, taxes_and_fees, deposit, total, paid_amount, remaining_amount
) VALUES (
  'c1000000-0000-0000-0000-000000000007', 'MCM-2026-007', 'b1000000-0000-0000-0000-000000000007', 'be47c5a0-5915-4e45-a355-bcda4a85bb5b', '2026-08-15', '2026-08-20',
  2, 1, 'checked_in', 'paid', 'direct', NULL,
  5, 475, 57, 159.6, 532, 532, 0
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status;
INSERT INTO public.reservations (
  id, reservation_number, guest_id, room_type_id, check_in, check_out,
  adults, children, status, payment_status, source, special_requests,
  nights, room_price, taxes_and_fees, deposit, total, paid_amount, remaining_amount
) VALUES (
  'c1000000-0000-0000-0000-000000000008', 'MCM-2026-008', 'b1000000-0000-0000-0000-000000000008', 'de47c5a0-5915-4e45-a355-bcda4a85bb5d', '2026-08-18', '2026-08-25',
  4, 2, 'confirmed', 'deposit_paid', 'airbnb', 'Étage élevé si possible.',
  7, 1120, 134.4, 376.32, 1254.4, 376.32, 878.0800000000002
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status;
INSERT INTO public.reservations (
  id, reservation_number, guest_id, room_type_id, check_in, check_out,
  adults, children, status, payment_status, source, special_requests,
  nights, room_price, taxes_and_fees, deposit, total, paid_amount, remaining_amount
) VALUES (
  'c1000000-0000-0000-0000-000000000009', 'MCM-2026-009', 'b1000000-0000-0000-0000-000000000009', 'ce47c5a0-5915-4e45-a355-bcda4a85bb5c', '2026-08-22', '2026-08-27',
  2, 0, 'confirmed', 'paid', 'direct', NULL,
  5, 600, 72, 201.6, 672, 672, 0
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status;
INSERT INTO public.reservations (
  id, reservation_number, guest_id, room_type_id, check_in, check_out,
  adults, children, status, payment_status, source, special_requests,
  nights, room_price, taxes_and_fees, deposit, total, paid_amount, remaining_amount
) VALUES (
  'c1000000-0000-0000-0000-000000000010', 'MCM-2026-010', 'b1000000-0000-0000-0000-000000000010', 'ae47c5a0-5915-4e45-a355-bcda4a85bb5a', '2026-08-25', '2026-08-30',
  2, 0, 'confirmed', 'deposit_paid', 'booking_com', 'Deux lits simples.',
  5, 425, 51, 142.8, 476, 142.8, 333.2
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status;

-- 3. Invoices (10 invoices linked to reservations)
INSERT INTO public.invoices (
  id, reservation_id, invoice_number, issue_date, due_date, status,
  subtotal, tax_rate, tax_amount, total, paid_amount
) VALUES (
  'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'FAC-2026-0001', '2026-08-01', '2026-08-07', 'issued',
  570, 0.12, 68.4, 638.4, 191.52
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.invoices (
  id, reservation_id, invoice_number, issue_date, due_date, status,
  subtotal, tax_rate, tax_amount, total, paid_amount
) VALUES (
  'd1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'FAC-2026-0002', '2026-08-03', '2026-08-08', 'paid',
  600, 0.12, 72, 672, 672
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.invoices (
  id, reservation_id, invoice_number, issue_date, due_date, status,
  subtotal, tax_rate, tax_amount, total, paid_amount
) VALUES (
  'd1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'FAC-2026-0003', '2026-08-05', '2026-08-10', 'paid',
  425, 0.12, 51, 476, 476
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.invoices (
  id, reservation_id, invoice_number, issue_date, due_date, status,
  subtotal, tax_rate, tax_amount, total, paid_amount
) VALUES (
  'd1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 'FAC-2026-0004', '2026-08-07', '2026-08-14', 'issued',
  1120, 0.12, 134.4, 1254.4, 376.32
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.invoices (
  id, reservation_id, invoice_number, issue_date, due_date, status,
  subtotal, tax_rate, tax_amount, total, paid_amount
) VALUES (
  'd1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005', 'FAC-2026-0005', '2026-08-10', '2026-08-15', 'issued',
  600, 0.12, 72, 672, 0
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.invoices (
  id, reservation_id, invoice_number, issue_date, due_date, status,
  subtotal, tax_rate, tax_amount, total, paid_amount
) VALUES (
  'd1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000006', 'FAC-2026-0006', '2026-08-12', '2026-08-16', 'issued',
  340, 0.12, 40.8, 380.8, 114.24
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.invoices (
  id, reservation_id, invoice_number, issue_date, due_date, status,
  subtotal, tax_rate, tax_amount, total, paid_amount
) VALUES (
  'd1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000007', 'FAC-2026-0007', '2026-08-15', '2026-08-20', 'paid',
  475, 0.12, 57, 532, 532
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.invoices (
  id, reservation_id, invoice_number, issue_date, due_date, status,
  subtotal, tax_rate, tax_amount, total, paid_amount
) VALUES (
  'd1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000008', 'FAC-2026-0008', '2026-08-18', '2026-08-25', 'issued',
  1120, 0.12, 134.4, 1254.4, 376.32
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.invoices (
  id, reservation_id, invoice_number, issue_date, due_date, status,
  subtotal, tax_rate, tax_amount, total, paid_amount
) VALUES (
  'd1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000009', 'FAC-2026-0009', '2026-08-22', '2026-08-27', 'paid',
  600, 0.12, 72, 672, 672
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.invoices (
  id, reservation_id, invoice_number, issue_date, due_date, status,
  subtotal, tax_rate, tax_amount, total, paid_amount
) VALUES (
  'd1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000010', 'FAC-2026-0010', '2026-08-25', '2026-08-30', 'issued',
  425, 0.12, 51, 476, 142.8
) ON CONFLICT (id) DO NOTHING;

-- 4. Payments
INSERT INTO public.payments (
  id, reservation_id, invoice_id, amount, currency, method, status, paid_at
) VALUES (
  'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 191.52, 'TND', 'card', 'paid', '2026-08-01 14:00:00+00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.payments (
  id, reservation_id, invoice_id, amount, currency, method, status, paid_at
) VALUES (
  'e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 672, 'TND', 'card', 'paid', '2026-08-03 14:00:00+00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.payments (
  id, reservation_id, invoice_id, amount, currency, method, status, paid_at
) VALUES (
  'e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', 476, 'TND', 'card', 'paid', '2026-08-05 14:00:00+00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.payments (
  id, reservation_id, invoice_id, amount, currency, method, status, paid_at
) VALUES (
  'e1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', 376.32, 'TND', 'card', 'paid', '2026-08-07 14:00:00+00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.payments (
  id, reservation_id, invoice_id, amount, currency, method, status, paid_at
) VALUES (
  'e1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000006', 114.24, 'TND', 'card', 'paid', '2026-08-12 14:00:00+00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.payments (
  id, reservation_id, invoice_id, amount, currency, method, status, paid_at
) VALUES (
  'e1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000007', 532, 'TND', 'card', 'paid', '2026-08-15 14:00:00+00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.payments (
  id, reservation_id, invoice_id, amount, currency, method, status, paid_at
) VALUES (
  'e1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000008', 376.32, 'TND', 'card', 'paid', '2026-08-18 14:00:00+00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.payments (
  id, reservation_id, invoice_id, amount, currency, method, status, paid_at
) VALUES (
  'e1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000009', 672, 'TND', 'card', 'paid', '2026-08-22 14:00:00+00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.payments (
  id, reservation_id, invoice_id, amount, currency, method, status, paid_at
) VALUES (
  'e1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000010', 142.8, 'TND', 'card', 'paid', '2026-08-25 14:00:00+00'
) ON CONFLICT (id) DO NOTHING;
