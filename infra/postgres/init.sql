-- Initial database setup script
-- Runs only on first container creation

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schema for future use
CREATE SCHEMA IF NOT EXISTS revwave;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE revwave TO revwave;
GRANT ALL PRIVILEGES ON SCHEMA public TO revwave;
GRANT ALL PRIVILEGES ON SCHEMA revwave TO revwave;
