-- Seed packet inventory
CREATE TABLE IF NOT EXISTS garden_seed_inventory (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id     uuid NOT NULL,
  plant_name       text NOT NULL,
  variety          text,
  plant_family     text,
  quantity_seeds   int,
  purchase_year    int,
  expiry_year      int,
  germination_rate int CHECK (germination_rate BETWEEN 0 AND 100),
  supplier         text,
  notes            text,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE garden_seed_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_members_seeds" ON garden_seed_inventory
  USING (is_household_member(household_id));

CREATE INDEX garden_seed_inventory_household_idx ON garden_seed_inventory(household_id);
