-- Create a dedicated user for API access
-- Replace 'secure_password' with an actual strong password
CREATE USER api_user WITH PASSWORD 'secure_password';

-- Grant specific permissions to the api_user
-- Only give access to the specific table needed for API operations
GRANT SELECT, INSERT, UPDATE, DELETE ON api_test TO api_user;
GRANT USAGE, SELECT ON SEQUENCE api_test_id_seq TO api_user;

-- Apply security best practices
ALTER USER api_user SET statement_timeout = '30s';  -- Prevent long-running queries
ALTER USER api_user CONNECTION LIMIT 100;           -- Limit concurrent connections
ALTER USER api_user SET search_path = public;       -- Restrict schema access 