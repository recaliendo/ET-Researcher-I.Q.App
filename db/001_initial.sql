CREATE TABLE IF NOT EXISTS imports (
 id text PRIMARY KEY, version text NOT NULL, filename text NOT NULL, sha256 text NOT NULL,
 status text NOT NULL, limitations text NOT NULL, record_count integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(filename,sha256)
);
CREATE TABLE IF NOT EXISTS records (
 id text PRIMARY KEY, collection text NOT NULL, source_id text NOT NULL,
 release text NOT NULL, import_id text NOT NULL REFERENCES imports(id),
 payload jsonb NOT NULL, publication text NOT NULL DEFAULT 'private' CHECK(publication IN ('private','public')),
 UNIQUE(collection,source_id,release)
);
CREATE INDEX IF NOT EXISTS records_collection ON records(collection);
CREATE TABLE IF NOT EXISTS incidents (id text PRIMARY KEY, record_id text NOT NULL REFERENCES records(id), title text NOT NULL, country text, event_date text);
CREATE TABLE IF NOT EXISTS witnesses (id text PRIMARY KEY, record_id text NOT NULL REFERENCES records(id), incident_id text REFERENCES incidents(id));
CREATE TABLE IF NOT EXISTS sources (id text PRIMARY KEY, record_id text NOT NULL REFERENCES records(id), url text, title text);
CREATE TABLE IF NOT EXISTS artifacts (id text PRIMARY KEY, record_id text NOT NULL REFERENCES records(id), incident_id text REFERENCES incidents(id));
CREATE TABLE IF NOT EXISTS claims (id text PRIMARY KEY, record_id text NOT NULL REFERENCES records(id), incident_id text REFERENCES incidents(id), witness_id text REFERENCES witnesses(id), artifact_id text REFERENCES artifacts(id));
CREATE TABLE IF NOT EXISTS custody_transfers (id text PRIMARY KEY, record_id text NOT NULL REFERENCES records(id), artifact_id text REFERENCES artifacts(id));
CREATE TABLE IF NOT EXISTS relations (id text PRIMARY KEY, from_id text NOT NULL, to_id text NOT NULL, kind text NOT NULL, basis text NOT NULL, status text NOT NULL DEFAULT 'imported');
CREATE TABLE IF NOT EXISTS documents (id text PRIMARY KEY, import_id text REFERENCES imports(id), title text NOT NULL, content text NOT NULL, sha256 text NOT NULL, publication text NOT NULL DEFAULT 'private');
CREATE TABLE IF NOT EXISTS chunks (id text PRIMARY KEY, document_id text NOT NULL REFERENCES documents(id), ordinal integer NOT NULL, content text NOT NULL, UNIQUE(document_id,ordinal));
CREATE TABLE IF NOT EXISTS providers (
 id text PRIMARY KEY, name text NOT NULL, url text NOT NULL, kind text NOT NULL,
 cadence_minutes integer NOT NULL CHECK(cadence_minutes >= 60), enabled boolean NOT NULL DEFAULT true,
 last_attempt timestamptz, last_success timestamptz, next_attempt timestamptz,
 failures integer NOT NULL DEFAULT 0, last_error text, etag text, modified text,
 policy_url text NOT NULL, license_note text NOT NULL
);
CREATE TABLE IF NOT EXISTS retrievals (id text PRIMARY KEY, provider_id text REFERENCES providers(id), retrieved_at timestamptz NOT NULL DEFAULT now(), status integer, sha256 text, item_count integer NOT NULL DEFAULT 0, error text);
CREATE TABLE IF NOT EXISTS feed_items (
 id text PRIMARY KEY, provider_id text NOT NULL REFERENCES providers(id), canonical_url text NOT NULL UNIQUE,
 title text NOT NULL, published_at timestamptz, ingested_at timestamptz NOT NULL DEFAULT now(),
 content_hash text NOT NULL, metadata jsonb NOT NULL, category text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewed','rejected','corrected','retracted')),
 summary text NOT NULL, summary_method text NOT NULL, novelty text NOT NULL,
 significance text NOT NULL, contradictions text NOT NULL DEFAULT 'Not assessed',
 incident_ids jsonb NOT NULL DEFAULT '[]', original_source_status text NOT NULL DEFAULT 'Unassessed; not independent corroboration'
);
CREATE TABLE IF NOT EXISTS feed_versions (id text PRIMARY KEY, item_id text NOT NULL REFERENCES feed_items(id), retrieval_id text NOT NULL REFERENCES retrievals(id), content_hash text NOT NULL, metadata jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS review_decisions (id text PRIMARY KEY, item_id text NOT NULL REFERENCES feed_items(id), actor text NOT NULL, decision text NOT NULL, rationale text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS tasks (id text PRIMARY KEY, incident_id text, title text NOT NULL, purpose text NOT NULL, priority text NOT NULL, state text NOT NULL DEFAULT 'Proposed', metadata jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_log (id text PRIMARY KEY, actor text NOT NULL, action text NOT NULL, target text NOT NULL, details jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS subscriptions (id text PRIMARY KEY, subscriber_hash text NOT NULL, category text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(subscriber_hash,category));
CREATE TABLE IF NOT EXISTS notifications (id text PRIMARY KEY, subscription_id text REFERENCES subscriptions(id), item_id text REFERENCES feed_items(id), message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(subscription_id,item_id));
CREATE TABLE IF NOT EXISTS analyses (id text PRIMARY KEY, kind text NOT NULL, inputs jsonb NOT NULL, outputs jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS ai_runs (id text PRIMARY KEY, question text NOT NULL, mode text NOT NULL, citations jsonb NOT NULL, answer jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS job_leases (id text PRIMARY KEY, expires_at timestamptz NOT NULL);
