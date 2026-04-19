-- =========================================
-- 045: Gifts tab — wish list + shopping list hybrid
-- =========================================
-- Each row belongs to a recipient (whose list it's on). Any household member
-- can add an item to anyone's list. When another member marks an item "Bought",
-- the bought state and the buyer's running total are hidden from the recipient
-- so the gift stays a surprise. Clear Totals zeros the running totals for both
-- users (via totals_cleared_at) but leaves the gift rows intact.

CREATE TABLE IF NOT EXISTS gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  recipient_member_id UUID NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  added_by_member_id UUID REFERENCES household_members(id) ON DELETE SET NULL,

  name TEXT,
  gift_date DATE DEFAULT CURRENT_DATE,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  store TEXT,
  price NUMERIC(10, 2),
  color_material TEXT,
  size TEXT,
  link TEXT,

  bought BOOLEAN NOT NULL DEFAULT FALSE,
  bought_by_member_id UUID REFERENCES household_members(id) ON DELETE SET NULL,
  bought_at TIMESTAMPTZ,
  totals_cleared_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gifts_household_recipient_idx
  ON gifts (household_id, recipient_member_id);

CREATE INDEX IF NOT EXISTS gifts_running_total_idx
  ON gifts (household_id, bought_by_member_id)
  WHERE bought = TRUE AND totals_cleared_at IS NULL;

ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gifts_all" ON gifts;
CREATE POLICY "gifts_all" ON gifts TO authenticated
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));
