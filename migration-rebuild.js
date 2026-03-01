/**
 * Scola Database Schema Rebuild
 * Run: node migration-rebuild.js
 * 
 * ⚠️  This will DROP and recreate: users, institutions, teachers, email_verification_tokens
 * Other tables (students, classes, etc.) are left untouched.
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
        multipleStatements: true,
    });

    const conn = await pool.getConnection();

    try {
        console.log('🔄 Starting Scola Database Schema Rebuild...\n');

        // ═══════════════════════════════════════════════════════════
        // Step 1: Drop old tables (order matters for FKs)
        // ═══════════════════════════════════════════════════════════
        console.log('🗑️  Dropping old tables...');
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        await conn.query('DROP TABLE IF EXISTS email_verification_tokens');
        await conn.query('DROP TABLE IF EXISTS teachers');
        await conn.query('DROP TABLE IF EXISTS institutions');
        await conn.query('DROP TABLE IF EXISTS users');
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('   ✅ Old tables dropped\n');

        // ═══════════════════════════════════════════════════════════
        // Step 2: Create users table
        // ═══════════════════════════════════════════════════════════
        console.log('📦 Creating users table...');
        await conn.query(`
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(150) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('institution_admin', 'teacher') NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ users table created\n');

        // ═══════════════════════════════════════════════════════════
        // Step 3: Create institutions table
        // ═══════════════════════════════════════════════════════════
        console.log('📦 Creating institutions table...');
        await conn.query(`
            CREATE TABLE institutions (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                owner_user_id VARCHAR(36) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ institutions table created\n');

        // ═══════════════════════════════════════════════════════════
        // Step 4: Create teachers table
        // ═══════════════════════════════════════════════════════════
        console.log('📦 Creating teachers table...');
        await conn.query(`
            CREATE TABLE teachers (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) UNIQUE NOT NULL,
                institution_id VARCHAR(36) DEFAULT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                qualification ENUM('bachelor', 'master', 'phd', 'diploma', 'other') DEFAULT NULL,
                subject VARCHAR(100) NOT NULL,
                phone VARCHAR(20) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL,
                INDEX idx_institution (institution_id),
                INDEX idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ teachers table created\n');

        // ═══════════════════════════════════════════════════════════
        // Step 5: Create email_verification_tokens table
        // ═══════════════════════════════════════════════════════════
        console.log('📦 Creating email_verification_tokens table...');
        await conn.query(`
            CREATE TABLE email_verification_tokens (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_token (token)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ email_verification_tokens table created\n');

        // ═══════════════════════════════════════════════════════════
        // Verify
        // ═══════════════════════════════════════════════════════════
        const [tables] = await conn.query(`
            SELECT TABLE_NAME, TABLE_ROWS 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME
        `, [process.env.DB_NAME]);

        console.log('📊 All tables in database:');
        tables.forEach(t => {
            console.log(`   • ${t.TABLE_NAME} (${t.TABLE_ROWS || 0} rows)`);
        });

        console.log('\n🎉 Database schema rebuild completed successfully!');
        console.log('\n📋 New schema:');
        console.log('   users (id, email, password_hash, role, is_active)');
        console.log('   institutions (id, name, owner_user_id → users)');
        console.log('   teachers (id, user_id → users, institution_id → institutions?, first_name, last_name, qualification, subject, phone)');
        console.log('   email_verification_tokens (id, user_id → users, token, expires_at)');

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error(err);
    } finally {
        conn.release();
        await pool.end();
    }
}

migrate();
