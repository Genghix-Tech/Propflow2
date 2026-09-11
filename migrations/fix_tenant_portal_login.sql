-- ============================================================
-- PropFlow — Fix Tenant Portal login lookup
-- Run this in Supabase SQL Editor
-- ============================================================

-- The tenant portal login screen (TenantLogin.jsx) signs a tenant in with
-- just a USERNAME, not an email — but Supabase auth requires an email to
-- sign in with. So TenantAuthContext.signIn looks up the tenant's real
-- (synthetic) auth email from this view first, using only the username,
-- BEFORE the tenant is authenticated (no session exists yet at that point).
--
-- Because a plain view runs with its owner's privileges (not the caller's),
-- this safely exposes just enough — username → email + active flag — to
-- the unauthenticated "anon" role, without granting anon any direct access
-- to auth.users or the tenants table itself.
CREATE OR REPLACE VIEW public.tenant_portal_lookup AS
  SELECT
    t.portal_username,
    u.email AS portal_email,
    t.portal_active
  FROM public.tenants t
  JOIN auth.users u ON u.id = t.portal_user_id
  WHERE t.portal_username IS NOT NULL;

-- Must be selectable by "anon" — this is the piece most likely to have
-- been missing, causing every tenant login attempt to fail with a generic
-- "Invalid username or password" regardless of the actual credentials.
GRANT SELECT ON public.tenant_portal_lookup TO anon, authenticated;
