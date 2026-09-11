-- ============================================================
-- PropFlow — Split "security deposit" into Security + Advance deposit
-- Run this in Supabase SQL Editor
-- ============================================================

-- Security (tenants.security_deposit, already exists) — refundable security
-- held by the landlord, auto-suggested as 2× monthly rent. Billed once, ADDED
-- to the tenant's first invoice (invoices.security_deposit_amount).

-- Advance deposit — a separate one-time amount the tenant actually hands over
-- at signing (e.g. a token/advance payment), which is SUBTRACTED from the
-- tenant's first invoice total since it's already been collected.
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS advance_deposit NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS advance_deposit_amount NUMERIC DEFAULT 0;
