// simple-db-schema.js
// Run this script with: node simple-db-schema.js

const mysql = require('mysql2/promise');

async function getBasicSchemaInfo() {
  // Create the connection using the provided credentials
  const connection = await mysql.createConnection({
    host: '10.128.0.31',
    user: 'oafuser',
    password: 'oafpass',
    database: 'oaf'
  });

  try {
    console.log('DATABASE SCHEMA FOR: oaf\n');
    
    // Get list of all tables
    const [tables] = await connection.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = ?', 
      ['oaf']
    );
    
    console.log('Tables in database:');
    tables.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    // For each table, get its columns
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\n--- TABLE: ${tableName} ---`);
      
      // Get columns and their details
      const [columns] = await connection.query(
        `SELECT 
          column_name, 
          column_type,
          is_nullable,
          column_key,
          column_default,
          extra
        FROM 
          information_schema.columns 
        WHERE 
          table_schema = ? AND table_name = ?
        ORDER BY 
          ordinal_position`,
        ['oaf', tableName]
      );
      
      // Print column information
      columns.forEach(column => {
        console.log(`  ${column.column_name} (${column.column_type})${column.column_key === 'PRI' ? ' PRIMARY KEY' : ''}${column.is_nullable === 'NO' ? ' NOT NULL' : ''}${column.extra ? ' ' + column.extra : ''}`);
      });
      
      // Get foreign keys
      const [foreignKeys] = await connection.query(
        `SELECT
          constraint_name,
          column_name,
          referenced_table_name,
          referenced_column_name
        FROM
          information_schema.key_column_usage
        WHERE
          table_schema = ? AND table_name = ?
          AND referenced_table_name IS NOT NULL`,
        ['oaf', tableName]
      );
      
      if (foreignKeys.length > 0) {
        console.log('\n  Foreign Keys:');
        foreignKeys.forEach(fk => {
          console.log(`  - ${fk.column_name} references ${fk.referenced_table_name}(${fk.referenced_column_name})`);
        });
      }
    }
  } catch (error) {
    console.error('Error retrieving schema information:', error);
  } finally {
    await connection.end();
  }
}

getBasicSchemaInfo().catch(console.error);
