#!/bin/bash

# Database connection details
DB_HOST="10.128.0.31"
DB_USER="oafuser"
DB_PASS="oafpass"
DB_NAME="oaf"

# Create output directory if it doesn't exist
mkdir -p database/schema/extracted

# Function to execute MySQL command
mysql_cmd() {
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "$1" | cat
}

# Extract table structures
echo "Extracting table structures..."
mysql_cmd "
SELECT 
    CONCAT(
        'CREATE TABLE \`', table_name, '\` (\n',
        GROUP_CONCAT(
            CONCAT(
                '  \`', column_name, '\` ',
                column_type,
                IF(column_default IS NOT NULL, CONCAT(' DEFAULT ', column_default), ''),
                IF(is_nullable = 'NO', ' NOT NULL', ''),
                IF(extra != '', CONCAT(' ', extra), '')
            )
            ORDER BY ordinal_position
            SEPARATOR ',\n'
        ),
        '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;'
    ) as create_table
FROM information_schema.columns
WHERE table_schema = '$DB_NAME'
GROUP BY table_name
ORDER BY table_name;
" > database/schema/extracted/tables.sql

# Extract foreign keys
echo "Extracting foreign keys..."
mysql_cmd "
SELECT 
    CONCAT(
        'ALTER TABLE \`', k.table_name, '\`\n',
        'ADD CONSTRAINT \`', k.constraint_name, '\`\n',
        'FOREIGN KEY (\`', k.column_name, '\`)\n',
        'REFERENCES \`', k.referenced_table_name, '\` (\`', k.referenced_column_name, '\`);'
    ) as add_foreign_key
FROM information_schema.key_column_usage k
JOIN information_schema.table_constraints tc 
    ON k.constraint_name = tc.constraint_name 
    AND k.table_schema = tc.table_schema
WHERE k.table_schema = '$DB_NAME'
AND tc.constraint_type = 'FOREIGN KEY'
AND k.referenced_table_name IS NOT NULL
ORDER BY k.table_name, k.constraint_name;
" > database/schema/extracted/foreign_keys.sql

# Extract indexes
echo "Extracting indexes..."
mysql_cmd "
SELECT 
    CONCAT(
        'CREATE ',
        CASE 
            WHEN index_type = 'FULLTEXT' THEN 'FULLTEXT '
            WHEN non_unique = 0 THEN 'UNIQUE '
            ELSE ''
        END,
        'INDEX \`', index_name, '\` ON \`', table_name, '\`\n',
        '(\n',
        GROUP_CONCAT(
            CONCAT('  \`', column_name, '\`')
            ORDER BY seq_in_index
            SEPARATOR ',\n'
        ),
        '\n);'
    ) as create_index
FROM information_schema.statistics
WHERE table_schema = '$DB_NAME'
AND index_name != 'PRIMARY'
GROUP BY table_name, index_name, index_type, non_unique
ORDER BY table_name, index_name;
" > database/schema/extracted/indexes.sql

# Extract triggers
echo "Extracting triggers..."
mysql_cmd "
SELECT 
    CONCAT(
        'DELIMITER //\n',
        'CREATE TRIGGER \`', trigger_name, '\`\n',
        action_timing, ' ', event_manipulation, ' ON \`', event_object_table, '\`\n',
        'FOR EACH ROW\n',
        action_statement,
        '//\n',
        'DELIMITER ;'
    ) as create_trigger
FROM information_schema.triggers
WHERE trigger_schema = '$DB_NAME'
ORDER BY event_object_table, trigger_name;
" > database/schema/extracted/triggers.sql

# Create a summary file
echo "Creating summary..."
{
    echo "# Database Schema Summary"
    echo "Generated on: $(date)"
    echo ""
    echo "## Tables"
    mysql_cmd "SELECT table_name FROM information_schema.tables WHERE table_schema = '$DB_NAME' ORDER BY table_name;"
    echo ""
    echo "## Indexes"
    mysql_cmd "SELECT DISTINCT table_name, index_name FROM information_schema.statistics WHERE table_schema = '$DB_NAME' AND index_name != 'PRIMARY' ORDER BY table_name, index_name;"
    echo ""
    echo "## Foreign Keys"
    mysql_cmd "SELECT DISTINCT k.table_name, k.constraint_name FROM information_schema.key_column_usage k JOIN information_schema.table_constraints tc ON k.constraint_name = tc.constraint_name AND k.table_schema = tc.table_schema WHERE k.table_schema = '$DB_NAME' AND tc.constraint_type = 'FOREIGN KEY' ORDER BY k.table_name, k.constraint_name;"
    echo ""
    echo "## Triggers"
    mysql_cmd "SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = '$DB_NAME' ORDER BY event_object_table, trigger_name;"
} > database/schema/extracted/summary.md

echo "Schema extraction complete. Files are in database/schema/extracted/" 