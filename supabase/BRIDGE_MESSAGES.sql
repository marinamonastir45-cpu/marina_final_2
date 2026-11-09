-- ============================================================
-- SQL SCRIPT: Bridge contact conversations & messages to /admin/messages
-- ============================================================

-- 1. Relax profiles FK to auth.users so guests/clients from contact form can exist in profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Insert the 4 conversation clients into public.profiles
INSERT INTO public.profiles (id, full_name, email, role, status)
VALUES 
  ('cbad2169-9c6c-4782-a75b-d757885cb8e6', 'Rayen Mabrouk', 'rayenemabrouk70@gmail.com', 'client', 'active'),
  ('38f79f31-3275-4344-ac50-b18e869bc757', 'Rawan', 'rayenemabrouk70@gmail.com', 'client', 'active'),
  ('5b30d774-3e15-4bc6-8eaf-42b03a03c88f', 'fakroun', 'rayenmabrouk365@gmail.com', 'client', 'active'),
  ('af2e66db-59a5-43e8-ae2b-c120303b544c', 'fakroun (Test 2)', 'rayenmabrouk365@gmail.com', 'client', 'active')
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = 'client',
  status = 'active';

-- 3. Insert the 5 messages mapped to the client profiles and admin
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Pick the active owner profile
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'owner' ORDER BY created_at DESC LIMIT 1;

  -- Conv 1: Rayen Mabrouk
  INSERT INTO public.messages (id, sender_id, receiver_id, body, is_read, created_at)
  VALUES 
    ('ac86cb09-257e-4f75-9370-2fb5433f6d98', 'cbad2169-9c6c-4782-a75b-d757885cb8e6', v_admin_id, '[Réservation Appart-Hôtel] test', false, '2026-08-09T00:15:42.875748+00:00'),
    ('3f99b814-56d7-4000-8585-656c7318ac62', v_admin_id, 'cbad2169-9c6c-4782-a75b-d757885cb8e6', 'attend', true, '2026-08-09T00:16:00.000000+00:00')
  ON CONFLICT (id) DO NOTHING;

  -- Conv 2: Rawan
  INSERT INTO public.messages (id, sender_id, receiver_id, body, is_read, created_at)
  VALUES 
    ('6deffe81-841a-4584-a660-23a1565f799a', '38f79f31-3275-4344-ac50-b18e869bc757', v_admin_id, '[Réservation Appart-Hôtel] salur', false, '2026-08-09T01:00:00.000000+00:00')
  ON CONFLICT (id) DO NOTHING;

  -- Conv 3: fakroun
  INSERT INTO public.messages (id, sender_id, receiver_id, body, is_read, created_at)
  VALUES 
    ('ee1571de-273e-456b-b195-36d08409d46d', '5b30d774-3e15-4bc6-8eaf-42b03a03c88f', v_admin_id, '[Réservation Appart-Hôtel] hola migos', false, '2026-08-09T01:34:38.146414+00:00')
  ON CONFLICT (id) DO NOTHING;

  -- Conv 4: fakroun test 2
  INSERT INTO public.messages (id, sender_id, receiver_id, body, is_read, created_at)
  VALUES 
    ('0ea0746c-5c5c-4008-a73a-947c792a6f69', 'af2e66db-59a5-43e8-ae2b-c120303b544c', v_admin_id, '[Réservation Appart-Hôtel] test', false, '2026-08-09T01:40:00.000000+00:00')
  ON CONFLICT (id) DO NOTHING;

END $$;
