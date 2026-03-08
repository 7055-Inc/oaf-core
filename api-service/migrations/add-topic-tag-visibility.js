#!/usr/bin/env node
/**
 * Migration: Add visibility + owner_id columns to article_topics and article_tags
 * 
 * visibility ENUM('admin', 'all_users', 'private') DEFAULT 'admin'
 *   - admin: only manage_content users can assign articles to these
 *   - all_users: any authenticated author can use these
 *   - private: only the owner_id user can see/use these
 * 
 * owner_id: FK to users, used when visibility = 'private'
 * 
 * Also inserts a "Wholesale" topic with admin visibility.
 */
require('dotenv').config();
const db = require('../config/db');

async function migrate() {
  try {
    // --- article_topics: add visibility column ---
    const [topicVisCols] = await db.query("SHOW COLUMNS FROM article_topics LIKE 'visibility'");
    if (topicVisCols.length === 0) {
      console.log('Adding visibility column to article_topics...');
      await db.query("ALTER TABLE article_topics ADD COLUMN visibility ENUM('admin', 'all_users', 'private') NOT NULL DEFAULT 'admin'");
      console.log('✓ article_topics.visibility added');
    } else {
      console.log('✓ article_topics.visibility already exists');
    }

    // --- article_topics: add owner_id column ---
    const [topicOwnerCols] = await db.query("SHOW COLUMNS FROM article_topics LIKE 'owner_id'");
    if (topicOwnerCols.length === 0) {
      console.log('Adding owner_id column to article_topics...');
      await db.query("ALTER TABLE article_topics ADD COLUMN owner_id BIGINT NULL");
      await db.query("ALTER TABLE article_topics ADD CONSTRAINT fk_topic_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL");
      console.log('✓ article_topics.owner_id added with FK');
    } else {
      console.log('✓ article_topics.owner_id already exists');
    }

    // --- article_tags: add visibility column ---
    const [tagVisCols] = await db.query("SHOW COLUMNS FROM article_tags LIKE 'visibility'");
    if (tagVisCols.length === 0) {
      console.log('Adding visibility column to article_tags...');
      await db.query("ALTER TABLE article_tags ADD COLUMN visibility ENUM('admin', 'all_users', 'private') NOT NULL DEFAULT 'admin'");
      console.log('✓ article_tags.visibility added');
    } else {
      console.log('✓ article_tags.visibility already exists');
    }

    // --- article_tags: add owner_id column ---
    const [tagOwnerCols] = await db.query("SHOW COLUMNS FROM article_tags LIKE 'owner_id'");
    if (tagOwnerCols.length === 0) {
      console.log('Adding owner_id column to article_tags...');
      await db.query("ALTER TABLE article_tags ADD COLUMN owner_id BIGINT NULL");
      await db.query("ALTER TABLE article_tags ADD CONSTRAINT fk_tag_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL");
      console.log('✓ article_tags.owner_id added with FK');
    } else {
      console.log('✓ article_tags.owner_id already exists');
    }

    // --- Insert Wholesale topic ---
    const [existing] = await db.query("SELECT id FROM article_topics WHERE slug = 'wholesale'");
    if (existing.length === 0) {
      console.log('Inserting Wholesale topic...');
      await db.query(
        `INSERT INTO article_topics (name, slug, description, visibility, meta_title, meta_description, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'Wholesale',
          'wholesale',
          'Articles about wholesale art buying, pricing, and business guides for retailers, designers, and galleries.',
          'admin',
          'Wholesale Art Resources | Brakebee',
          'Guides and articles for wholesale art buyers — retailers, interior designers, galleries, and hospitality businesses.',
          0
        ]
      );
      console.log('✓ Wholesale topic created');
    } else {
      console.log('✓ Wholesale topic already exists');
    }

    // --- Verify ---
    const [verifyTopicVis] = await db.query("SHOW COLUMNS FROM article_topics LIKE 'visibility'");
    const [verifyTopicOwner] = await db.query("SHOW COLUMNS FROM article_topics LIKE 'owner_id'");
    const [verifyTagVis] = await db.query("SHOW COLUMNS FROM article_tags LIKE 'visibility'");
    const [verifyTagOwner] = await db.query("SHOW COLUMNS FROM article_tags LIKE 'owner_id'");
    const [verifyWholesale] = await db.query("SELECT id, name, visibility FROM article_topics WHERE slug = 'wholesale'");

    console.log('\n--- Verification ---');
    console.log('article_topics.visibility:', verifyTopicVis.length > 0 ? '✓' : '✗');
    console.log('article_topics.owner_id:', verifyTopicOwner.length > 0 ? '✓' : '✗');
    console.log('article_tags.visibility:', verifyTagVis.length > 0 ? '✓' : '✗');
    console.log('article_tags.owner_id:', verifyTagOwner.length > 0 ? '✓' : '✗');
    console.log('Wholesale topic:', verifyWholesale.length > 0 ? `✓ (id=${verifyWholesale[0].id}, visibility=${verifyWholesale[0].visibility})` : '✗');

    process.exit(0);
  } catch (e) {
    console.error('Migration error:', e.message);
    process.exit(1);
  }
}

migrate();
