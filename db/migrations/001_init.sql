-- Lumi family sync and voice chat.
-- One family is reached only with its secret code (stored as a hash).
-- Progress holds a nickname and lesson JSON. No other personal data.
-- Applied by the Worker (see worker/src/migrate.ts), not from a laptop.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families (id) ON DELETE CASCADE,
  child_key text NOT NULL,
  nickname text NOT NULL DEFAULT 'friend',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, child_key)
);

CREATE TABLE progress_documents (
  child_id uuid PRIMARY KEY REFERENCES children (id) ON DELETE CASCADE,
  document jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES families (id) ON DELETE CASCADE,
  child_id uuid REFERENCES children (id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_family_created ON chat_messages (family_id, created_at DESC);

CREATE TABLE rate_limits (
  family_id uuid NOT NULL REFERENCES families (id) ON DELETE CASCADE,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL,
  PRIMARY KEY (family_id, bucket)
);
