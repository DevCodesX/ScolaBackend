/**
 * Fix existing tables that were not rebuilt
 * Run: node fix-existing-tables.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function fix() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔧 Fixing existing tables...\n');

        // 1. Add teacher_id to classes
        try {
            await pool.query('ALTER TABLE classes ADD COLUMN teacher_id VARCHAR(36) DEFAULT NULL');
            console.log('✅ Added teacher_id to classes');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('⏭️  teacher_id already exists in classes');
            else throw e;
        }

        // 2. Add created_at to classes
        try {
            await pool.query('ALTER TABLE classes ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            console.log('✅ Added created_at to classes');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('⏭️  created_at already exists in classes');
            else throw e;
        }

        // 3. Create students table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS students (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                email VARCHAR(150),
                phone VARCHAR(20),
                institution_id VARCHAR(36),
                class_id VARCHAR(36),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ students table ready');

        // 4. Create attendance table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id VARCHAR(36) PRIMARY KEY,
                student_id VARCHAR(36) NOT NULL,
                class_id VARCHAR(36) NOT NULL,
                date DATE NOT NULL,
                status ENUM('present','absent','late') DEFAULT 'absent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_attendance (student_id, class_id, date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ attendance table ready');

        // 5. Create grades table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS grades (
                id VARCHAR(36) PRIMARY KEY,
                student_id VARCHAR(36) NOT NULL,
                class_id VARCHAR(36) NOT NULL,
                grade_type VARCHAR(100),
                score DECIMAL(5,2),
                max_score DECIMAL(5,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ grades table ready');

        console.log('\n🎉 All fixes applied!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

fix();
