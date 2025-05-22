require('dotenv').config({ path: '/var/www/main/api-service/.env' });
const mysql = require('mysql2/promise');

async function notifyMediaServer() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('Checking for pending images...');
    const [rows] = await connection.execute(
      "SELECT id, user_id, image_path FROM pending_images WHERE status = 'pending'"
    );

    if (rows.length === 0) {
      console.log('No pending images to process.');
      return;
    }

    for (const row of rows) {
      console.log(`Placeholder: Notifying media server (media-vm at 34.60.105.144) to process image for user ${row.user_id}: ${row.image_path}`);
      // Placeholder: Add API call to media server here
      // Example: await fetch('https://34.60.105.144/process-image', { method: 'POST', body: JSON.stringify({ userId: row.user_id, imagePath: row.image_path }) });

      // Update status to 'processed' (for now, since we're using a placeholder)
      await connection.execute(
        "UPDATE pending_images SET status = 'processed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [row.id]
      );
      console.log(`Marked image as processed: ${row.image_path}`);
    }
  } catch (err) {
    console.error('Error notifying media server:', err.message, err.stack);
  } finally {
    await connection.end();
  }
}

notifyMediaServer();