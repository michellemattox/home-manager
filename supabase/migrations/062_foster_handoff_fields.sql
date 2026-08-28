-- ============================================================================
-- 062: Foster Puppy — handoff info on the profile
-- ============================================================================
-- Fields the next foster parent needs but that were never captured anywhere:
-- vet, medications, allergies, feeding habits, sleep/crate routine, behaviour.
-- Editable on the profile screen and printed onto the handoff report card.
--
-- Purely additive — ADD COLUMN IF NOT EXISTS only. No constraint is dropped, no
-- existing column altered, no row rewritten. Nullable with no default, so every
-- existing puppy row is untouched and simply reads NULL until filled in.
-- ============================================================================

ALTER TABLE foster_puppies ADD COLUMN IF NOT EXISTS vet_info TEXT;
ALTER TABLE foster_puppies ADD COLUMN IF NOT EXISTS medications TEXT;
ALTER TABLE foster_puppies ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE foster_puppies ADD COLUMN IF NOT EXISTS feeding_notes TEXT;
ALTER TABLE foster_puppies ADD COLUMN IF NOT EXISTS sleep_crate_notes TEXT;
ALTER TABLE foster_puppies ADD COLUMN IF NOT EXISTS behavior_notes TEXT;

-- The table's existing grants and RLS policy cover new columns automatically.
