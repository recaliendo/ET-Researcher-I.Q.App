-- Security hardening: server-side sessions (revocable, bound to the role-token generation that issued them).
CREATE TABLE IF NOT EXISTS sessions (
 id text PRIMARY KEY, role text NOT NULL CHECK(role IN ('reader','editor','admin')),
 token_fingerprint text NOT NULL, client_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires_at);
