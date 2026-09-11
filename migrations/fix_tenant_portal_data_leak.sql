-- ============================================================
-- PropFlow — Fix systemic tenant-portal data leak
-- Run this in Supabase SQL Editor
-- ============================================================
--
-- Root cause: many RLS SELECT/ALL policies across the database were written
-- as `auth.role() = 'authenticated'`, intending "any logged-in staff member".
-- But tenant portal accounts are ALSO `authenticated` Supabase users (they
-- just live in a different app/client) — so every one of these policies has
-- been granting tenants blanket access to ALL rows, not just their own,
-- combined via OR with whatever correctly-scoped tenant policy also exists.
--
-- This is why a tenant portal login could see every other tenant's invoices,
-- and — more seriously — every tenant's KYC documents, every employee's
-- salary, and the internal staff/roles tables.
--
-- Fix: replace `auth.role() = 'authenticated'` with a check that the caller
-- actually has a `profiles` row (i.e. is real staff, not a tenant portal
-- account). Tables where tenants already have their own correctly-scoped
-- policy (invoices, utility_charges, invoice_taxes, invoice_discounts,
-- invoice_security_installments, maintenance) keep working for tenants via
-- that separate policy — only the overly-broad "anyone authenticated" grant
-- is removed. buildings/units get a new tenant-scoped policy added (tenants
-- do need to see their OWN building/unit via the embedded join in
-- getMyTenantProfile()).

BEGIN;

DROP POLICY IF EXISTS "Authenticated users can read invoices" ON public.invoices;
CREATE POLICY "Authenticated users can read invoices" ON public.invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage invoice discounts" ON public.invoice_discounts;
CREATE POLICY "Authenticated users can manage invoice discounts" ON public.invoice_discounts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage security installments" ON public.invoice_security_installments;
CREATE POLICY "Authenticated users can manage security installments" ON public.invoice_security_installments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage invoice taxes" ON public.invoice_taxes;
CREATE POLICY "Authenticated users can manage invoice taxes" ON public.invoice_taxes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage utility charges" ON public.utility_charges;
CREATE POLICY "Authenticated users can manage utility charges" ON public.utility_charges FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Auth users read maintenance" ON public.maintenance;
CREATE POLICY "Auth users read maintenance" ON public.maintenance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- No tenant-portal page uses these tables at all — restrict fully to staff.
DROP POLICY IF EXISTS "Auth users read attendance" ON public.attendance;
CREATE POLICY "Auth users read attendance" ON public.attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
DROP POLICY IF EXISTS "Auth users update attendance" ON public.attendance;
CREATE POLICY "Auth users update attendance" ON public.attendance FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
DROP POLICY IF EXISTS "Auth users delete attendance" ON public.attendance;
CREATE POLICY "Auth users delete attendance" ON public.attendance FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Auth users read employees" ON public.employees;
CREATE POLICY "Auth users read employees" ON public.employees FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Auth users read salary" ON public.salary_payments;
CREATE POLICY "Auth users read salary" ON public.salary_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
DROP POLICY IF EXISTS "Auth users update salary" ON public.salary_payments;
CREATE POLICY "Auth users update salary" ON public.salary_payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
DROP POLICY IF EXISTS "Auth users delete salary" ON public.salary_payments;
CREATE POLICY "Auth users delete salary" ON public.salary_payments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid()));

DROP POLICY IF EXISTS "Auth users read roles" ON public.roles;
CREATE POLICY "Auth users read roles" ON public.roles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Auth users read permissions" ON public.role_permissions;
CREATE POLICY "Auth users read permissions" ON public.role_permissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage enquiries" ON public.enquiries;
CREATE POLICY "Authenticated users can manage enquiries" ON public.enquiries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- Most sensitive one: tenant KYC/ID documents were fully readable, editable,
-- and DELETABLE by any tenant for every tenant, with no scoped fallback.
DROP POLICY IF EXISTS "Authenticated users can manage tenant documents" ON public.tenant_documents;
CREATE POLICY "Authenticated users can manage tenant documents" ON public.tenant_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- buildings/units: tenants DO need to see their OWN building/unit (embedded
-- join from getMyTenantProfile()), so tighten staff access AND add a scoped
-- tenant policy instead of just removing tenant access outright.
DROP POLICY IF EXISTS "Authenticated users can read buildings" ON public.buildings;
CREATE POLICY "Authenticated users can read buildings" ON public.buildings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
DROP POLICY IF EXISTS "Tenants can view their own building" ON public.buildings;
CREATE POLICY "Tenants can view their own building" ON public.buildings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants WHERE tenants.building_id = buildings.id AND tenants.portal_user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read units" ON public.units;
CREATE POLICY "Authenticated users can read units" ON public.units FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
DROP POLICY IF EXISTS "Tenants can view their own unit" ON public.units;
CREATE POLICY "Tenants can view their own unit" ON public.units FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants WHERE tenants.unit_id = units.id AND tenants.portal_user_id = auth.uid()));

COMMIT;
