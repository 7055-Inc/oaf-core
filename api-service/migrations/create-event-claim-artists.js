#!/usr/bin/env node
/**
 * Migration: Create event_claim_artists table
 * 
 * Tracks multiple artists who confirm they're attending the same custom event.
 * When a promoter claims, all grouped artists are added as applicants.
 * 
 * The original artist is tracked via artist_custom_events.artist_id.
 * This table captures additional artists who confirmed "same event."
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function migrate() {
  try {
    const [tables] = await db.execute(
      `SELECT COUNT(*) as count FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_claim_artists'`
    );

    if (tables[0].count > 0) {
      console.log('✓ event_claim_artists table already exists');
    } else {
      console.log('Creating event_claim_artists table...');
      await db.execute(`
        CREATE TABLE event_claim_artists (
          id BIGINT NOT NULL AUTO_INCREMENT,
          artist_custom_event_id BIGINT NOT NULL,
          artist_id BIGINT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY unique_claim_artist (artist_custom_event_id, artist_id),
          KEY idx_artist_id (artist_id),
          CONSTRAINT event_claim_artists_ibfk_1 FOREIGN KEY (artist_custom_event_id) REFERENCES artist_custom_events(id) ON DELETE CASCADE,
          CONSTRAINT event_claim_artists_ibfk_2 FOREIGN KEY (artist_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `);
      console.log('✓ event_claim_artists table created');
    }

    console.log('\nMigration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
