-- ============================================================
-- PropFlow — Additional tables for Employees & Maintenance
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'other',
  -- roles: guard, cleaner, plumber, electrician, manager, other
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  salary NUMERIC DEFAULT 0,
  joining_date DATE,
  id_type TEXT DEFAULT 'aadhaar',
  id_number TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  status TEXT DEFAULT 'active',
  -- statuses: active, inactive
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (matches your existing pattern)
CREATE POLICY "Authenticated users can manage employees"
  ON employees FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 2. Maintenance requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other',
  -- categories: plumbing, electrical, hvac, painting, carpentry, cleaning, other
  priority TEXT DEFAULT 'medium',
  -- priorities: low, medium, high, urgent
  status TEXT DEFAULT 'open',
  -- statuses: open, in_progress, resolved, closed
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users can manage maintenance_requests"
  ON maintenance_requests FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
