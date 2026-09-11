-- ─────────────────────────────────────────────────────────────────────────
-- SECURITY HARDENING — full-project audit fixes
-- ─────────────────────────────────────────────────────────────────────────

-- 1. attendance / salary_payments: INSERT policies used
--    `auth.role() = 'authenticated'` — this matches BOTH staff sessions AND
--    tenant-portal sessions (both are Postgres role "authenticated"), so any
--    logged-in tenant could insert arbitrary attendance/salary rows via the
--    REST API directly. Tighten to staff-only.
DROP POLICY IF EXISTS "Auth users insert attendance" ON public.attendance;
CREATE POLICY "Auth users insert attendance"
  ON public.attendance FOR INSERT
  TO authenticated
  WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Auth users insert salary" ON public.salary_payments;
CREATE POLICY "Auth users insert salary"
  ON public.salary_payments FOR INSERT
  TO authenticated
  WITH CHECK (is_staff());

-- 2. is_owner() helper — same SECURITY DEFINER pattern as is_staff(), used to
--    gate role/permission management to Owners only (not every staff member).
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid() AND r.name = 'Owner'
  );
$$;

-- 3. profiles — two real bugs:
--    a) "Anyone can look up profile by username" (anon, qual=true) let any
--       unauthenticated visitor SELECT * on the whole table — a full staff
--       directory dump (usernames, roles, active status), not just a single
--       row lookup. Dropped — replaced by get_staff_email_by_username() RPC
--       below, which returns only the one matching row's login email.
--    b) "Users can update own profile" had no WITH CHECK restricting which
--       columns change — any logged-in staff member (even a Viewer) could
--       set their OWN role_id to an Owner role, or flip is_active back on
--       after being deactivated. Self-service update now explicitly forbids
--       changing role_id/is_active; only an Owner can change those (new
--       "Owner can update any profile" policy below).
DROP POLICY IF EXISTS "Anyone can look up profile by username" ON public.profiles;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role_id IS NOT DISTINCT FROM (SELECT p2.role_id FROM public.profiles p2 WHERE p2.id = auth.uid())
    AND is_active IS NOT DISTINCT FROM (SELECT p2.is_active FROM public.profiles p2 WHERE p2.id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner can update any profile" ON public.profiles;
CREATE POLICY "Owner can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

-- 4. roles / role_permissions had SELECT-only policies — no INSERT/UPDATE/
--    DELETE policy existed at all, which is why the app resorted to the
--    service-role client (supabaseAdmin) for role management, shipping that
--    key to the browser. Add proper Owner-gated write policies instead.
DROP POLICY IF EXISTS "Owner can manage roles" ON public.roles;
CREATE POLICY "Owner can manage roles"
  ON public.roles FOR ALL
  TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

DROP POLICY IF EXISTS "Owner can manage role permissions" ON public.role_permissions;
CREATE POLICY "Owner can manage role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

-- 5. get_staff_email_by_username — mirrors the existing (correct)
--    get_tenant_email_by_username pattern: one SECURITY DEFINER RPC that
--    resolves a single username to its login email + active flag, instead of
--    exposing the whole profiles table to anon for lookup.
CREATE OR REPLACE FUNCTION public.get_staff_email_by_username(p_username text)
RETURNS TABLE(user_id uuid, email text, is_active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, u.email, p.is_active
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.username = p_username;
$$;
REVOKE ALL ON FUNCTION public.get_staff_email_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_staff_email_by_username(text) TO anon, authenticated;

-- 6. get_user_email_by_id — took ANY uuid and returned that user's real email
--    with zero authorization check, callable by anyone with just the anon
--    key. Retired: nothing needs it anymore now that staff login uses
--    get_staff_email_by_username() above (and userService.js's dead
--    duplicate signInWithUsername() is removed from the app).
REVOKE EXECUTE ON FUNCTION public.get_user_email_by_id(uuid) FROM PUBLIC, anon, authenticated;

-- 7. tenant_portal_lookup view — created without security_invoker, so it ran
--    with the view OWNER's privileges (bypassing RLS on tenants/auth.users),
--    and was granted SELECT to `anon`. Anyone on the internet — no login
--    required — could read every tenant's portal username + real email.
--    Retired: get_tenant_email_by_username() RPC already does this lookup
--    safely (single row, by username, SECURITY DEFINER).
REVOKE ALL ON public.tenant_portal_lookup FROM anon, authenticated;

-- 8. buildings_public view — a simple auto-updatable view
--    (`SELECT id, name FROM buildings`) had INSERT/UPDATE/DELETE/TRUNCATE
--    grants left over for `anon`. Because the view has no security_invoker,
--    those writes would run with the view owner's privileges, bypassing the
--    buildings table's RLS entirely — i.e. any anonymous visitor could
--    insert/edit/delete buildings. Restricted to read-only, RLS-respecting.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.buildings_public FROM anon, authenticated;
ALTER VIEW public.buildings_public SET (security_invoker = true);

-- 9. tenant-documents storage bucket — policies only checked
--    `bucket_id = 'tenant-documents'`, no ownership scoping, for role
--    `authenticated` — meaning ANY logged-in tenant-portal tenant could
--    list/download/delete every OTHER tenant's KYC documents (CNIC scans,
--    bank statements, etc). The tenant portal never uses this bucket at all
--    (staff-only feature), so restrict it to staff.
DROP POLICY IF EXISTS "Authenticated users can upload tenant documents" ON storage.objects;
CREATE POLICY "Staff can upload tenant documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tenant-documents' AND is_staff());

DROP POLICY IF EXISTS "Authenticated users can view tenant documents" ON storage.objects;
CREATE POLICY "Staff can view tenant documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'tenant-documents' AND is_staff());

DROP POLICY IF EXISTS "Authenticated users can delete tenant documents" ON storage.objects;
CREATE POLICY "Staff can delete tenant documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'tenant-documents' AND is_staff());

-- 10. handle_new_user() trigger used a BLOCKLIST (skip @tenant.propflow.internal,
--     profile-ify everything else). Supabase Auth's public self-signup is
--     enabled on this project, so anyone could POST /auth/v1/signup with any
--     email and immediately get a `profiles` row with role='manager' —
--     making is_staff() true and granting read access to tenants, invoices,
--     employees, salary_payments, messages, etc. Flipped to an ALLOWLIST:
--     only @propflow.internal (which staff accounts always use, created via
--     the admin-ops Edge Function) gets a profile row. Any other signup gets
--     no profile — is_staff() stays false, zero access. Also strongly
--     recommend disabling public signup in Authentication settings.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  if new.email not like '%@propflow.internal' then
    return new;
  end if;

  insert into public.profiles (id, display_name, role)
  values (new.id, new.raw_user_meta_data->>'display_name', 'manager')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 11. messages INSERT policies didn't verify sender_id = auth.uid() — a
--     staff member (or tenant) could insert a message with an arbitrary
--     sender_id/sender_name, spoofing who it came from.
DROP POLICY IF EXISTS "Staff send messages" ON public.messages;
CREATE POLICY "Staff send messages"
  ON public.messages FOR INSERT
  TO public
  WITH CHECK (is_staff() AND sender_type = 'staff' AND sender_id = auth.uid());

DROP POLICY IF EXISTS "Tenant sends own messages" ON public.messages;
CREATE POLICY "Tenant sends own messages"
  ON public.messages FOR INSERT
  TO public
  WITH CHECK (
    sender_type = 'tenant' AND sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM tenants WHERE tenants.id = messages.tenant_id AND tenants.portal_user_id = auth.uid())
  );
