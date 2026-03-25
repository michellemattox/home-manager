-- AI Garden Advisor Recommendations
-- Run manually in Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS garden_advisor_recommendations (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id     uuid NOT NULL,
  generated_date   date NOT NULL DEFAULT CURRENT_DATE,
  recommendation   text NOT NULL,
  action_label     text,
  action_type      text NOT NULL DEFAULT 'garden', -- 'tasks'|'garden'|'watering'|'pests'|'harvest'
  priority         text NOT NULL DEFAULT 'normal',  -- 'urgent'|'normal'|'info'
  status           text NOT NULL DEFAULT 'pending', -- 'pending'|'accepted'|'dismissed'
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE garden_advisor_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_members_garden_advisor" ON garden_advisor_recommendations
  USING (is_household_member(household_id));

CREATE INDEX garden_advisor_household_date_idx
  ON garden_advisor_recommendations(household_id, generated_date);
