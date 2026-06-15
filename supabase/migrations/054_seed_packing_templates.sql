-- =========================================
-- 054: Seed starter Packing List Templates
-- =========================================
-- Seeds the four destination packing lists from the "Vacay Tips and Tricks"
-- sheet (Las Vegas, Mexico, Hotel/Resort Getaway, Hawaii) for every household.
-- Depends on migration 052 (packing_templates + packing_template_items).
--
-- Idempotent: a template is only inserted if that household doesn't already have
-- one with the same name, so this is safe to re-run. Items duplicated across the
-- source grid (e.g. "Electrolyte powder") are de-duplicated. Cell qualifier notes
-- are kept in parentheses; "S:" notes are attributed to Sean. The two unassigned
-- rows (Anti-itch cream, First aid kit) are intentionally omitted.

DO $$
DECLARE
  hh RECORD;
  tpl_id UUID;
BEGIN
  FOR hh IN SELECT id FROM households LOOP

    -- ── Las Vegas ──────────────────────────────────────────────────────────
    IF NOT EXISTS (
      SELECT 1 FROM packing_templates WHERE household_id = hh.id AND name = 'Las Vegas'
    ) THEN
      INSERT INTO packing_templates (household_id, name, sort_order)
        VALUES (hh.id, 'Las Vegas', 0) RETURNING id INTO tpl_id;
      INSERT INTO packing_template_items (template_id, title, sort_order) VALUES
        (tpl_id, 'Leather Slippers', 0),
        (tpl_id, 'Rubber Slippers', 1),
        (tpl_id, 'Hats', 2),
        (tpl_id, 'Blink eye drops', 3),
        (tpl_id, 'Advil', 4),
        (tpl_id, 'Tums', 5),
        (tpl_id, 'Champagne topper', 6),
        (tpl_id, 'Electrolyte powder', 7),
        (tpl_id, 'Casino players cards', 8),
        (tpl_id, 'Lotion & cuticle oil', 9),
        (tpl_id, 'Headband', 10),
        (tpl_id, 'Sunscreen (1 sm can/day; 1 lg can/1.5 days)', 11),
        (tpl_id, 'Aloe / after sun lotion', 12),
        (tpl_id, 'Blister bandaid', 13),
        (tpl_id, 'COVID tests', 14),
        (tpl_id, 'cash', 15),
        (tpl_id, 'Ear buds for concerts', 16),
        (tpl_id, 'Benadryl', 17),
        (tpl_id, 'beach chair clips', 18),
        (tpl_id, 'z-biotics', 19);
    END IF;

    -- ── Mexico ─────────────────────────────────────────────────────────────
    IF NOT EXISTS (
      SELECT 1 FROM packing_templates WHERE household_id = hh.id AND name = 'Mexico'
    ) THEN
      INSERT INTO packing_templates (household_id, name, sort_order)
        VALUES (hh.id, 'Mexico', 1) RETURNING id INTO tpl_id;
      INSERT INTO packing_template_items (template_id, title, sort_order) VALUES
        (tpl_id, 'Leather Slippers (Sean: 1 pair)', 0),
        (tpl_id, 'Rubber Slippers (Sean: only 1 pair)', 1),
        (tpl_id, 'T-shirts (dress code dependent for restaurant)', 2),
        (tpl_id, 'Aloha wear for dress code breakfast', 3),
        (tpl_id, 'Hats (Sean: only 2)', 4),
        (tpl_id, 'Resort cups', 5),
        (tpl_id, 'Blink eye drops', 6),
        (tpl_id, 'Advil', 7),
        (tpl_id, 'Tums', 8),
        (tpl_id, 'Champagne topper', 9),
        (tpl_id, 'Electrolyte powder', 10),
        (tpl_id, 'Lotion & cuticle oil', 11),
        (tpl_id, 'Headband', 12),
        (tpl_id, 'Sunscreen (1 sm can/day; 1 lg can/1.5 days)', 13),
        (tpl_id, 'Aloe / after sun lotion', 14),
        (tpl_id, 'COVID tests', 15),
        (tpl_id, 'cash', 16),
        (tpl_id, 'Benadryl', 17),
        (tpl_id, 'beach chair clips', 18),
        (tpl_id, 'z-biotics', 19);
    END IF;

    -- ── Hotel/Resort Getaway ───────────────────────────────────────────────
    IF NOT EXISTS (
      SELECT 1 FROM packing_templates WHERE household_id = hh.id AND name = 'Hotel/Resort Getaway'
    ) THEN
      INSERT INTO packing_templates (household_id, name, sort_order)
        VALUES (hh.id, 'Hotel/Resort Getaway', 2) RETURNING id INTO tpl_id;
      INSERT INTO packing_template_items (template_id, title, sort_order) VALUES
        (tpl_id, 'Soaking tub pillow', 0),
        (tpl_id, 'Bath bombs/bubble bath', 1),
        (tpl_id, 'Bottle opener', 2),
        (tpl_id, 'Champagne topper', 3),
        (tpl_id, 'Ugg slippers', 4),
        (tpl_id, 'Fuzzy socks', 5),
        (tpl_id, 'Extra pillow', 6),
        (tpl_id, 'Comfy lounge clothes', 7),
        (tpl_id, 'Lotion & cuticle oil', 8),
        (tpl_id, 'COVID tests', 9);
    END IF;

    -- ── Hawaii ─────────────────────────────────────────────────────────────
    IF NOT EXISTS (
      SELECT 1 FROM packing_templates WHERE household_id = hh.id AND name = 'Hawaii'
    ) THEN
      INSERT INTO packing_templates (household_id, name, sort_order)
        VALUES (hh.id, 'Hawaii', 3) RETURNING id INTO tpl_id;
      INSERT INTO packing_template_items (template_id, title, sort_order) VALUES
        (tpl_id, 'Leather Slippers', 0),
        (tpl_id, 'Rubber Slippers', 1),
        (tpl_id, 'Hats', 2),
        (tpl_id, 'Blink eye drops', 3),
        (tpl_id, 'Electrolyte powder', 4),
        (tpl_id, 'Lotion & cuticle oil', 5),
        (tpl_id, 'Headband', 6),
        (tpl_id, 'Sunscreen (1 sm can/day; 1 lg can/1.5 days)', 7),
        (tpl_id, 'Aloe / after sun lotion', 8),
        (tpl_id, 'Backpack for Hikes', 9),
        (tpl_id, 'Raincoat (Kauai)', 10),
        (tpl_id, 'Extra bag for return trip', 11),
        (tpl_id, 'COVID tests', 12),
        (tpl_id, 'Benadryl', 13),
        (tpl_id, 'beach chair clips', 14),
        (tpl_id, 'z-biotics', 15);
    END IF;

  END LOOP;
END $$;
