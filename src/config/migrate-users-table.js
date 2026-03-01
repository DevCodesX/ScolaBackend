/**
 * Database Migration Script
 * Adds missing columns to users table and creates email_verification_tokens table
 * Safe to re-run multiple times.
 */
require('dotenv').config();
const db = require('./db.js');

async function migrate() {
    console.log('🔄 Starting database migration...\n');

    try {
        // ─── 1. Add missing columns to users table ─────────────────
        const columnsToAdd = [
            { name: 'first_name', definition: 'VARCHAR(100) DEFAULT NULL AFTER name' },
            { name: 'last_name', definition: 'VARCHAR(100) DEFAULT NULL AFTER first_name' },
            { name: 'email_verified', definition: 'BOOLEAN DEFAULT FALSE AFTER password' },
            { name: 'qualifications', definition: 'VARCHAR(255) DEFAULT NULL AFTER role' },
            { name: 'subject', definition: 'VARCHAR(100) DEFAULT NULL AFTER qualifications' },
        ];

        for (const col of columnsToAdd) {
            try {
                await db.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.definition}`);
                console.log(`  ✅ Added column 'users.${col.name}'`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`  ⏭️  Column 'users.${col.name}' already exists — skipping`);
                } else {
                    throw err;
                }
            }
        }

        // ─── 2. Create email_verification_tokens table ─────────────
        await db.query(`
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                token VARCHAR(36) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('  ✅ Table "email_verification_tokens" is ready');

        console.log('\n🎉 Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error(err);
        process.exit(1);
    }
}

migrate();
