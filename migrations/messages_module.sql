-- ============================================================
-- PropFlow — Dedicated Messages module (staff-side inbox)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Register "messages" as its own permission module, so it shows up in
-- Role Management like every other section.
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_module_check;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_module_check
  CHECK (module = ANY (ARRAY['dashboard','tenants','invoices','employees','maintenance','buildings','reports','settings','tenant_portal','enquiries','messages']));

-- Give existing roles view+send access by default (adjust in Role Management UI)
INSERT INTO public.role_permissions (role_id, module, can_view, can_add, can_edit, can_delete)
SELECT id, 'messages', true, true, false, false FROM public.roles
ON CONFLICT (role_id, module) DO NOTHING;

-- One row per tenant with an active conversation — the latest message plus
-- who sent it — powering the staff Messages inbox list AND the "new message"
-- notification bell item. security_invoker=true is required here: plain
-- views otherwise run with the VIEW OWNER's privileges (bypassing RLS
-- entirely), not the querying user's — without it, every tenant portal user
-- would see every other tenant's conversations through this view.
CREATE OR REPLACE VIEW public.tenant_conversations
WITH (security_invoker = true) AS
SELECT DISTINCT ON (m.tenant_id)
  m.tenant_id,
  m.body AS last_message,
  m.sender_type AS last_sender_type,
  m.created_at AS last_message_at,
  t.full_name AS tenant_name,
  t.phone AS tenant_phone,
  b.name AS building_name,
  u.unit_number,
  m.id AS message_id
FROM public.messages m
JOIN public.tenants t ON t.id = m.tenant_id
LEFT JOIN public.buildings b ON b.id = t.building_id
LEFT JOIN public.units u ON u.id = t.unit_id
ORDER BY m.tenant_id, m.created_at DESC;

GRANT SELECT ON public.tenant_conversations TO authenticated;
