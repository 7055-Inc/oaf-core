-- Create article_images table to support multiple images per article
-- Mirrors the product_images pattern with primary flag and ordering

CREATE TABLE article_images (
  id BIGINT NOT NULL AUTO_INCREMENT,
  article_id BIGINT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  friendly_name VARCHAR(255) DEFAULT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  alt_text VARCHAR(255) DEFAULT NULL,
  `order` INT DEFAULT 0,
  category ENUM('featured', 'content', 'thumbnail', 'social') DEFAULT 'content',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_article_images_article (article_id),
  KEY idx_article_images_primary (article_id, is_primary),
  KEY idx_article_images_order (article_id, `order`),
  CONSTRAINT fk_article_images_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

