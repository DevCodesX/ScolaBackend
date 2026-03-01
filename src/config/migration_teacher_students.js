require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // ─── 1. Create teacher_students table ───────────────────
        await pool.query(`CREATE TABLE IF NOT EXISTS teacher_students (
            id                  VARCHAR(36) PRIMARY KEY,
            user_id             VARCHAR(36) DEFAULT NULL,
            teacher_id          VARCHAR(36) NOT NULL,
            student_name        VARCHAR(255) DEFAULT NULL,
            student_email       VARCHAR(255) DEFAULT NULL,
            student_phone       VARCHAR(50) DEFAULT NULL,
            status              ENUM('pending', 'active', 'suspended', 'expired') DEFAULT 'pending',
            access_expires_at   DATETIME DEFAULT NULL,
            notes               TEXT DEFAULT NULL,
            created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        console.log('✅ teacher_students table ready');

        // ─── 2. Create invite_tokens table ──────────────────────
        await pool.query(`CREATE TABLE IF NOT EXISTS invite_tokens (
            id              VARCHAR(36) PRIMARY KEY,
            teacher_id      VARCHAR(36) NOT NULL,
            token           VARCHAR(64) NOT NULL UNIQUE,
            expires_at      DATETIME NOT NULL,
            max_uses        INT DEFAULT 1,
            used_count      INT DEFAULT 0,
            is_active       BOOLEAN DEFAULT true,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        console.log('✅ invite_tokens table ready');

        // ─── 3. Add join_code column to teachers table ──────────
        const [cols] = await pool.query(
            `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teachers' AND COLUMN_NAME = 'join_code'`
        );
        if (cols[0].cnt === 0) {
            await pool.query(`ALTER TABLE teachers ADD COLUMN join_code VARCHAR(20) DEFAULT NULL UNIQUE`);
            console.log('✅ Added join_code column to teachers');

            // Generate join_codes for existing free teachers
            const [freeTeachers] = await pool.query(
                `SELECT id, first_name FROM teachers WHERE teacher_type = 'free' AND join_code IS NULL`
            );
            for (const t of freeTeachers) {
                const code = 'SCL-' + (t.first_name || '').toUpperCase().slice(0, 4) + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
                try {
                    await pool.query(`UPDATE teachers SET join_code = ? WHERE id = ?`, [code, t.id]);
                    console.log(`  → Set join_code for ${t.first_name}: ${code}`);
                } catch (e) {
                    // If duplicate, generate a different one
                    const alt = 'SCL-' + crypto.randomBytes(4).toString('hex').toUpperCase();
                    await pool.query(`UPDATE teachers SET join_code = ? WHERE id = ?`, [alt, t.id]);
                    console.log(`  → Set join_code for ${t.first_name}: ${alt} (alt)`);
                }
            }
        } else {
            console.log('ℹ️  join_code column already exists');
        }

        // ─── 4. Create indexes ──────────────────────────────────
        const indexes = [
            ['idx_ts_teacher', 'teacher_students', 'teacher_id'],
            ['idx_ts_user', 'teacher_students', 'user_id'],
            ['idx_ts_status', 'teacher_students', 'status'],
            ['idx_it_teacher', 'invite_tokens', 'teacher_id'],
            ['idx_it_token', 'invite_tokens', 'token'],
        ];
        for (const [name, table, col] of indexes) {
            try {
                await pool.query(`CREATE INDEX ${name} ON ${table}(${col})`);
                console.log(`✅ Created index ${name}`);
            } catch (e) {
                if (e.code === 'ER_DUP_KEYNAME') {
                    console.log(`ℹ️  Index ${name} already exists`);
                } else {
                    throw e;
                }
            }
        }

        console.log('\n🎉 Teacher Students migration completed successfully!');
    } catch (e) {
        console.error('❌ Migration error:', e.message);
        process.exit(1);
    }

    await pool.end();
})();
