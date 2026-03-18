-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- HOUSEHOLDS & MEMBERS
-- =========================================

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  zip_code TEXT,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,  -- auth.uid() or 'pending' for invites
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  color_hex TEXT NOT NULL DEFAULT '#3b82f6',
  invite_token TEXT UNIQUE,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_household_members_user_id ON household_members(user_id);
CREATE INDEX idx_household_members_household_id ON household_members(household_id);
CREATE INDEX idx_household_members_invite_token ON household_members(invite_token);

-- =========================================
-- PROJECTS
-- =========================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'completed', 'on_hold')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  expected_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES household_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_owners (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, member_id)
);

CREATE TABLE project_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id UUID REFERENCES household_members(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_household_id ON projects(household_id);
CREATE INDEX idx_project_updates_project_id ON project_updates(project_id);

-- =========================================
-- TRAVEL
-- =========================================

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES household_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trip_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE trip_task_owners (
  trip_task_id UUID NOT NULL REFERENCES trip_tasks(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_task_id, member_id)
);

CREATE INDEX idx_trips_household_id ON trips(household_id);
CREATE INDEX idx_trip_tasks_trip_id ON trip_tasks(trip_id);

-- =========================================
-- RECURRING MAINTENANCE TASKS
-- =========================================

CREATE TABLE recurring_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  frequency_type TEXT NOT NULL
    CHECK (frequency_type IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  frequency_days INTEGER NOT NULL DEFAULT 30,
  anchor_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  last_completed_at TIMESTAMPTZ,
  assigned_member_id UUID REFERENCES household_members(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recurring_task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recurring_task_id UUID NOT NULL REFERENCES recurring_tasks(id) ON DELETE CASCADE,
  completed_by UUID REFERENCES household_members(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_recurring_tasks_household_id ON recurring_tasks(household_id);
CREATE INDEX idx_recurring_tasks_next_due_date ON recurring_tasks(next_due_date);
CREATE INDEX idx_task_completions_task_id ON recurring_task_completions(recurring_task_id);

-- =========================================
-- HIRE-OUT SERVICE HISTORY
-- =========================================

CREATE TABLE service_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  service_date DATE NOT NULL,
  cost_cents INTEGER NOT NULL DEFAULT 0,  -- stored as cents to avoid float issues
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_records_household_id ON service_records(household_id);
CREATE INDEX idx_service_records_service_date ON service_records(service_date);

-- =========================================
-- IDEAS
-- =========================================

CREATE TABLE idea_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES idea_topics(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_id UUID REFERENCES household_members(id),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_idea_topics_household_id ON idea_topics(household_id);
CREATE INDEX idx_ideas_topic_id ON ideas(topic_id);

-- =========================================
-- PUSH NOTIFICATION TOKENS
-- =========================================

CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, expo_push_token)
);

CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
