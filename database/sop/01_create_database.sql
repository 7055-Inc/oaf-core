-- SOP Catalog: create database (run once as root)
-- Usage: mysql -h 10.128.0.31 -P 3306 -u root -p < 01_create_database.sql

CREATE DATABASE IF NOT EXISTS brakebee_sop
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- Grant app user access (adjust user/host if different)
GRANT ALL PRIVILEGES ON brakebee_sop.* TO 'oafuser'@'%';
FLUSH PRIVILEGES;
