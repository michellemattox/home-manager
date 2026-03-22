-- =========================================
-- 027: Notification preferences per member
-- =========================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  member_id         UUID PRIMARY KEY REFERENCES household_members(id) ON DELETE CASCADE,
  household_id      UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  overdue_enabled   BOOLEAN NOT NULL DEFAULT true,
  due_soon_enabled  BOOLEAN NOT NULL DEFAULT true,
  reminder_hour     INTEGER NOT NULL DEFAULT 8,  -- local PT hour (0-23)
  reminder_frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (reminder_frequency IN ('daily', 'every_other_day', 'weekly', 'monthly')),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can read notification prefs"
  ON notification_preferences FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "members can insert own notification prefs"
  ON notification_preferences FOR INSERT
  WITH CHECK (
    member_id IN (SELECT id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "members can update own notification prefs"
  ON notification_preferences FOR UPDATE
  USING (
    member_id IN (SELECT id FROM household_members WHERE user_id = auth.uid())
  );

-- Service role can read all (for Edge Function)
CREATE POLICY "service role full access"
  ON notification_preferences FOR ALL
  USING (auth.role() = 'service_role');
