-- ============================================================
-- PropFlow — Enable Realtime on the messages table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Every live-chat feature in the app (staff <-> tenant messaging, the
-- Messages inbox, the new-message notification popup+sound) subscribes to
-- postgres_changes on public.messages. That subscription silently never
-- fires unless the table is added to Supabase's realtime publication —
-- RLS alone is not enough. Without this, "live" messages only ever
-- appeared to update because of query refetches, not actual realtime push.
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- messages.is_read already existed in the schema but was never wired up —
-- no policy allowed updating it, so it always stayed false. These let each
-- side mark the OTHER side's messages as read (never their own), powering
-- the unread-count badges on both the staff and tenant portal sidebars.
CREATE POLICY "Staff can mark tenant messages read" ON public.messages FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "Tenant can mark staff messages read" ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = messages.tenant_id AND tenants.portal_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = messages.tenant_id AND tenants.portal_user_id = auth.uid()));
