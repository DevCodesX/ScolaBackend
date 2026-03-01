/**
 * IAM Database Migration
 * Run: node migration-iam.js
 * 
 * Adds IAM-related columns and tables to the Scola database.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔄 Starting IAM migration...\n');

        // 1. Add email_verified column to users table
        try {
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE
            `);
            console.log('✅ Added email_verified column to users table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  email_verified column already exists');
            } else {
                console.error('⚠️  email_verified:', err.message);
            }
        }

        // 2. Add first_name column
        try {
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)
            `);
            console.log('✅ Added first_name column to users table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  first_name column already exists');
            } else {
                console.error('⚠️  first_name:', err.message);
            }
        }

        // 3. Add last_name column
        try {
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)
            `);
            console.log('✅ Added last_name column to users table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  last_name column already exists');
            } else {
                console.error('⚠️  last_name:', err.message);
            }
        }

        // 4. Add qualifications column
        try {
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS qualifications VARCHAR(255)
            `);
            console.log('✅ Added qualifications column to users table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  qualifications column already exists');
            } else {
                console.error('⚠️  qualifications:', err.message);
            }
        }

        // 5. Add subject column to users table
        try {
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS subject VARCHAR(100)
            `);
            console.log('✅ Added subject column to users table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  subject column already exists');
            } else {
                console.error('⚠️  subject:', err.message);
            }
        }

        // 6. Create email_verification_tokens table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_token (token),
                INDEX idx_user_id (user_id)
            )
        `);
        console.log('✅ Created email_verification_tokens table');

        // 7. Set existing users as verified
        await pool.query(`
            UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL OR email_verified = FALSE
        `);
        console.log('✅ Marked existing users as verified');

        console.log('\n🎉 IAM migration completed successfully!');
    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
