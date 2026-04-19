-- =========================================
-- 046: Gifts — shared "Home" list
-- =========================================
-- Make recipient_member_id nullable. NULL represents the shared household
-- "Home" list that both members can add to and buy from. All other behavior
-- (RLS, indexes) is unchanged.

ALTER TABLE gifts ALTER COLUMN recipient_member_id DROP NOT NULL;
