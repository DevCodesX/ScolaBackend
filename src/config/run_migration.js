require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // 1. Check and add teacher_type column
        const [cols] = await pool.query(
            `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teachers' AND COLUMN_NAME = 'teacher_type'`
        );
        if (cols[0].cnt === 0) {
            await pool.query(`ALTER TABLE teachers ADD COLUMN teacher_type ENUM('free','institution') NOT NULL DEFAULT 'institution' AFTER institution_id`);
            console.log('✅ Added teacher_type column');
        } else {
            console.log('ℹ️  teacher_type column already exists');
        }

        // 2. Create teacher_invitations table
        await pool.query(`CREATE TABLE IF NOT EXISTS teacher_invitations (
            id             VARCHAR(36) PRIMARY KEY,
            institution_id VARCHAR(36) NOT NULL,
            email          VARCHAR(255) NOT NULL,
            first_name     VARCHAR(255) NOT NULL,
            last_name      VARCHAR(255) DEFAULT NULL,
            subject        VARCHAR(255) DEFAULT NULL,
            phone          VARCHAR(50)  DEFAULT NULL,
            token          VARCHAR(255) NOT NULL UNIQUE,
            status         ENUM('pending','accepted','expired') DEFAULT 'pending',
            expires_at     DATETIME NOT NULL,
            created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        )`);
        console.log('✅ teacher_invitations table ready');

        // 3. Create indexes (ignore if already exist)
        const indexes = [
            ['idx_invitations_token', 'teacher_invitations', 'token'],
            ['idx_invitations_email', 'teacher_invitations', 'email'],
            ['idx_invitations_institution', 'teacher_invitations', 'institution_id'],
            ['idx_teachers_type', 'teachers', 'teacher_type'],
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

        console.log('\n🎉 Migration completed successfully!');
    } catch (e) {
        console.error('❌ Migration error:', e.message);
        process.exit(1);
    }

    await pool.end();
})();
