-- South Savory shared data. One row per thing: a menu item, a lunch day / batch / drop /
-- custom order, an order, a holiday. Each phone pushes the rows it changed and pulls
-- the rows changed since it last looked (rev is a server-side counter, never a phone clock).
CREATE TABLE IF NOT EXISTS records (
  id      TEXT PRIMARY KEY,
  data    TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  ts      INTEGER NOT NULL,          -- when the phone saved it; the later save wins
  rev     INTEGER NOT NULL           -- order of arrival on the server
);
CREATE INDEX IF NOT EXISTS records_rev ON records(rev);
CREATE TABLE IF NOT EXISTS counter (k TEXT PRIMARY KEY, v INTEGER NOT NULL);
INSERT OR IGNORE INTO counter (k, v) VALUES ('rev', 0);
