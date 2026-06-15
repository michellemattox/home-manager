-- =========================================
-- 052: Packing List Templates (Activity tab)
-- =========================================
-- Household-scoped reusable packing lists. Managed in Settings → Home area.
-- When applied to an activity, a template's items are inserted as trip_tasks
-- under a "Packing" checklist. Selecting multiple templates merges their items
-- into one checklist with duplicates removed (deduped client-side, case-insensitive).
--
-- Two tables: a template (the list) and its ordered items. sort_order drives the
-- drag-and-drop / arrow ordering in Settings.

CREATE TABLE IF NOT EXISTS packing_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packing_template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES packing_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS packing_templates_household_idx
  ON packing_templates (household_id);
CREATE INDEX IF NOT EXISTS packing_template_items_template_idx
  ON packing_template_items (template_id);

ALTER TABLE packing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_template_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packing_templates_all" ON packing_templates;
CREATE POLICY "packing_templates_all" ON packing_templates TO authenticated
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

-- Items inherit access from their parent template's household.
DROP POLICY IF EXISTS "packing_template_items_all" ON packing_template_items;
CREATE POLICY "packing_template_items_all" ON packing_template_items TO authenticated
  USING (EXISTS (
    SELECT 1 FROM packing_templates t
    WHERE t.id = template_id AND is_household_member(t.household_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM packing_templates t
    WHERE t.id = template_id AND is_household_member(t.household_id)
  ));

-- Data API grants (required since the 2026-10-30 Supabase change).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packing_templates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packing_template_items TO anon, authenticated;
