-- v10: deterministic feed triage (separate from human review status) and research-readiness snapshots.
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS workflow_state text;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS disposition text;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS triage jsonb;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS policy_version text;
CREATE INDEX IF NOT EXISTS feed_items_disposition ON feed_items(disposition);
CREATE TABLE IF NOT EXISTS readiness_snapshots (id text PRIMARY KEY, fingerprint text NOT NULL UNIQUE, stages jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
