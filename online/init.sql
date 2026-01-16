-- init.sql for online lottery (Open + Pro) - PostgreSQL
-- Safe to run on a fresh database.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    CREATE TYPE event_status AS ENUM ('DRAFT', 'RUNNING', 'ENDED', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'round_status') THEN
    CREATE TYPE round_status AS ENUM ('PENDING', 'DRAWN', 'CONFIRMED', 'VOIDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
    CREATE TYPE org_role AS ENUM ('ADMIN', 'HOST', 'STAFF');
  END IF;
END$$;

-- Open tables
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  status event_status NOT NULL DEFAULT 'DRAFT',
  locked boolean NOT NULL DEFAULT false,
  require_finish_prize boolean NOT NULL DEFAULT false,
  participant_mode text NOT NULL DEFAULT 'csv',
  required_fields jsonb NOT NULL DEFAULT '["display_name"]'::jsonb,
  custom_field_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'default',
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  unique_key text,
  employee_id text,
  email text,
  username text,
  department text,
  title text,
  org_path text,
  custom_field text,
  checked_in_at timestamptz,
  has_won boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'default',
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  level text NOT NULL,
  name text NOT NULL,
  total_count int NOT NULL CHECK (total_count >= 0),
  remaining_count int NOT NULL CHECK (remaining_count >= 0),
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS draw_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'default',
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  prize_id uuid NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
  round_no int NOT NULL DEFAULT 1 CHECK (round_no >= 1),
  draw_count int NOT NULL CHECK (draw_count > 0),
  status round_status NOT NULL DEFAULT 'PENDING',
  seed_commit text,
  seed_reveal text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'default',
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES draw_rounds(id) ON DELETE CASCADE,
  prize_id uuid NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'default',
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  actor text NOT NULL,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Open indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_unique_key
  ON participants(tenant_id, event_id, unique_key)
  WHERE unique_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_participants_has_won
  ON participants(tenant_id, event_id, has_won);

CREATE INDEX IF NOT EXISTS idx_prizes_event
  ON prizes(tenant_id, event_id, order_index);

CREATE INDEX IF NOT EXISTS idx_rounds_event
  ON draw_rounds(tenant_id, event_id, prize_id, status);

CREATE INDEX IF NOT EXISTS idx_winners_event
  ON winners(tenant_id, event_id, prize_id);

CREATE INDEX IF NOT EXISTS idx_audit_event
  ON audit_logs(tenant_id, event_id, action);

-- Pro tables
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role org_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  tenant_id text,
  subscription_expires_at timestamptz NOT NULL,
  max_participants int NOT NULL CHECK (max_participants >= 0),
  data_retention_days int NOT NULL CHECK (data_retention_days >= 0),
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlements_org_or_tenant CHECK (
    (org_id IS NOT NULL AND tenant_id IS NULL) OR
    (org_id IS NULL AND tenant_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_entitlements_org
  ON entitlements(org_id);

CREATE INDEX IF NOT EXISTS idx_entitlements_tenant
  ON entitlements(tenant_id);
