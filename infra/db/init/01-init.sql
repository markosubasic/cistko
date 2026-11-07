-- One PostgreSQL server, one database per app. The three datathon-2026 databases are kept so this
-- repository can share the dev database with the other team repositories (same Docker project).
-- Runs once on first initialisation of the data volume (psql, so \connect works).

CREATE DATABASE blizu;
CREATE DATABASE otporno;
CREATE DATABASE nabavaradar;
CREATE DATABASE cistko;

\connect blizu
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

\connect otporno
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

\connect nabavaradar
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

\connect cistko
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
