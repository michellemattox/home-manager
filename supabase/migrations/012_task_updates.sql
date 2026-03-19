-- =========================================
-- 012: Task updates — Low-Lift time_of_day, Project Adjacent notes in checklist
-- =========================================

-- 1. Add time_of_day to recurring_tasks (for Low-Lift reminder scheduling)
ALTER TABLE recurring_tasks ADD COLUMN IF NOT EXISTS time_of_day TIME;

-- 2. Add notes to project_tasks (for Project Adjacent tasks that live in checklists)
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS notes TEXT;
