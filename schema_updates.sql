CREATE TABLE user_logins (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  provider ENUM('google', 'email') NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  api_prefix VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (provider, provider_id)
);
CREATE TABLE user_types (
  user_id BIGINT NOT NULL,
  type ENUM('artist', 'promoter', 'community', 'admin') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
ALTER TABLE api_keys
  DROP COLUMN private_key,
  ADD COLUMN private_key_hashed VARCHAR(255) NOT NULL AFTER public_key;
ALTER TABLE users
  ADD COLUMN wp_id BIGINT AFTER last_login,
  ADD COLUMN meta_title VARCHAR(255) AFTER wp_id,
  ADD COLUMN meta_description TEXT AFTER meta_title;
CREATE INDEX idx_user_logins_user_id ON user_logins(user_id);
CREATE INDEX idx_user_types_type ON user_types(type); 