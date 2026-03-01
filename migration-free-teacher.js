/**
 * Migration: Free Teacher System
 * Run: node migration-free-teacher.js
 * 
 * 1. Adds teacher_type ENUM('free','institution') to teachers table
 * 2. Updates existing free teachers (institution_id IS NULL) to teacher_type='free'
 * 3. Adds owner_teacher_id to students table for free teacher ownership
 * 4. Adds index on attendance(class_id, date)
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
        console.log('🔄 Starting free teacher migration...\n');

        // ── 1. Add teacher_type to teachers ──
        console.log('📦 Adding teacher_type column to teachers...');
        const [cols] = await conn.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'teachers' AND COLUMN_NAME = 'teacher_type'`,
            [process.env.DB_NAME]
        );

        if (cols.length === 0) {
            await conn.query(`
                ALTER TABLE teachers 
                ADD COLUMN teacher_type ENUM('free','institution') NOT NULL DEFAULT 'institution'
            `);
            console.log('   ✅ teacher_type column added');
        } else {
            console.log('   ⏭️  teacher_type column already exists');
        }

        // Always update existing free teachers (safe to run multiple times)
        const [result] = await conn.query(`
            UPDATE teachers SET teacher_type = 'free' WHERE institution_id IS NULL AND teacher_type != 'free'
        `);
        console.log(`   ✅ Updated ${result.affectedRows} existing free teachers`);

        // ── 2. Add owner_teacher_id to students ──
        console.log('📦 Adding owner_teacher_id column to students...');
        const [studentCols] = await conn.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND COLUMN_NAME = 'owner_teacher_id'`,
            [process.env.DB_NAME]
        );

        if (studentCols.length === 0) {
            await conn.query(`
                ALTER TABLE students 
                ADD COLUMN owner_teacher_id VARCHAR(36) DEFAULT NULL,
                ADD INDEX idx_owner_teacher (owner_teacher_id),
                ADD CONSTRAINT fk_student_owner_teacher 
                    FOREIGN KEY (owner_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
            `);
            console.log('   ✅ owner_teacher_id column added with FK and index');
        } else {
            console.log('   ⏭️  owner_teacher_id column already exists');
        }

        // ── 3. Add index on attendance(class_id, date) if not exists ──
        console.log('📦 Checking attendance index...');
        const [indexes] = await conn.query(
            `SHOW INDEX FROM attendance WHERE Key_name = 'idx_class_date'`
        );

        if (indexes.length === 0) {
            await conn.query(`
                ALTER TABLE attendance ADD INDEX idx_class_date (class_id, date)
            `);
            console.log('   ✅ attendance(class_id, date) index added');
        } else {
            console.log('   ⏭️  attendance index already exists');
        }

        // ── Verify ──
        console.log('\n📊 Verification:');
        const [teacherCols2] = await conn.query(
            `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'teachers' AND COLUMN_NAME = 'teacher_type'`,
            [process.env.DB_NAME]
        );
        console.log('   teachers.teacher_type:', teacherCols2[0]?.COLUMN_TYPE || 'NOT FOUND');

        const [studentCols2] = await conn.query(
            `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND COLUMN_NAME = 'owner_teacher_id'`,
            [process.env.DB_NAME]
        );
        console.log('   students.owner_teacher_id:', studentCols2[0]?.COLUMN_TYPE || 'NOT FOUND');

        console.log('\n🎉 Free teacher migration completed!');

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error(err);
    } finally {
        conn.release();
        await pool.end();
    }
}

migrate();
