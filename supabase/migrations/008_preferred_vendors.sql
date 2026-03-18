CREATE TABLE IF NOT EXISTS preferred_vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service_type TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preferred_vendors_household_id ON preferred_vendors(household_id);

ALTER TABLE preferred_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preferred_vendors_all" ON preferred_vendors
  TO authenticated
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));
