/**
 * Scola Full Database Init
 * Run: node migration-full.js
 * 
 * Creates ALL tables needed by the application (IF NOT EXISTS).
 * Safe to run multiple times.
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
        console.log('🔄 Starting full database initialization...\n');

        // ── users ──
        console.log('📦 Creating users table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(150) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('institution_admin', 'teacher') NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ users');

        // ── institutions ──
        console.log('📦 Creating institutions table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS institutions (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                owner_user_id VARCHAR(36) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ institutions');

        // ── teachers ──
        console.log('📦 Creating teachers table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS teachers (
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
        console.log('   ✅ teachers');

        // ── email_verification_tokens ──
        console.log('📦 Creating email_verification_tokens table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_token (token)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ email_verification_tokens');

        // ── students ──
        console.log('📦 Creating students table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS students (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                email VARCHAR(150) DEFAULT NULL,
                phone VARCHAR(20) DEFAULT NULL,
                institution_id VARCHAR(36) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL,
                INDEX idx_institution (institution_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ students');

        // ── classes ──
        console.log('📦 Creating classes table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS classes (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                teacher_id VARCHAR(36) DEFAULT NULL,
                institution_id VARCHAR(36) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
                FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL,
                INDEX idx_teacher (teacher_id),
                INDEX idx_institution (institution_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ classes');

        // ── student_classes (junction table) ──
        console.log('📦 Creating student_classes table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS student_classes (
                student_id VARCHAR(36) NOT NULL,
                class_id VARCHAR(36) NOT NULL,
                PRIMARY KEY (student_id, class_id),
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ student_classes');

        // ── timetable ──
        console.log('📦 Creating timetable table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS timetable (
                id VARCHAR(36) PRIMARY KEY,
                class_id VARCHAR(36) NOT NULL,
                teacher_id VARCHAR(36) NOT NULL,
                day ENUM('sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri') NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
                INDEX idx_class (class_id),
                INDEX idx_teacher (teacher_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ timetable');

        // ── grades ──
        console.log('📦 Creating grades table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS grades (
                id VARCHAR(36) PRIMARY KEY,
                student_id VARCHAR(36) NOT NULL,
                class_id VARCHAR(36) NOT NULL,
                grade_type VARCHAR(50) NOT NULL,
                score DECIMAL(5,2) NOT NULL,
                max_score DECIMAL(5,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                INDEX idx_student (student_id),
                INDEX idx_class (class_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ grades');

        // ── attendance ──
        console.log('📦 Creating attendance table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id VARCHAR(36) PRIMARY KEY,
                student_id VARCHAR(36) NOT NULL,
                class_id VARCHAR(36) NOT NULL,
                date DATE NOT NULL,
                status ENUM('present', 'absent', 'late') DEFAULT 'absent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_attendance (student_id, class_id, date),
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                INDEX idx_class_date (class_id, date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ attendance');

        // ── courses ──
        console.log('📦 Creating courses table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS courses (
                id VARCHAR(36) PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT DEFAULT NULL,
                teacher_id VARCHAR(36) NOT NULL,
                price DECIMAL(10,2) DEFAULT 0,
                max_students INT DEFAULT NULL,
                type VARCHAR(50) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
                INDEX idx_teacher (teacher_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ courses');

        // ── subscriptions ──
        console.log('📦 Creating subscriptions table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id VARCHAR(36) PRIMARY KEY,
                student_id VARCHAR(36) NOT NULL,
                course_id VARCHAR(36) NOT NULL,
                status ENUM('active', 'cancelled', 'expired') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                INDEX idx_student (student_id),
                INDEX idx_course (course_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ subscriptions');

        // ── Verify ──
        const [tables] = await conn.query(`
            SELECT TABLE_NAME, TABLE_ROWS 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME
        `, [process.env.DB_NAME]);

        console.log('\n📊 All tables in database:');
        tables.forEach(t => {
            console.log(`   • ${t.TABLE_NAME} (${t.TABLE_ROWS || 0} rows)`);
        });

        console.log('\n🎉 Full database initialization completed!');

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error(err);
    } finally {
        conn.release();
        await pool.end();
    }
}

migrate();
