-- Create the api_test table
CREATE TABLE api_test (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT TRUE,
    message VARCHAR(255) DEFAULT 'Hello World',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert a single test record
INSERT INTO api_test (message) VALUES ('Hello World'); 