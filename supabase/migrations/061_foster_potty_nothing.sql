-- ============================================================================
-- 061: Foster Puppy — add "#0 · Nothing" to the potty log
-- ============================================================================
-- Records a trip outside where the puppy didn't go. Useful on its own (you can
-- see you took them out) and it deliberately does NOT count as an elimination:
-- the projection model ignores these when measuring gaps, so a fruitless trip
-- doesn't reset the clock on when the next #1 or #2 is due.
--
-- Note this migration DROPs a constraint — that is the intended change, and it
-- only replaces the kind whitelist on foster_potty_logs. No data is touched:
-- every existing row holds 'pee', 'poop' or 'both', all of which remain valid
-- under the new constraint.
-- ============================================================================

ALTER TABLE foster_potty_logs
  DROP CONSTRAINT IF EXISTS foster_potty_logs_kind_check;

ALTER TABLE foster_potty_logs
  ADD CONSTRAINT foster_potty_logs_kind_check
  CHECK (kind IN ('nothing', 'pee', 'poop', 'both'));
