// Create timetable table
require('dotenv').config();
const db = require('./src/db.js');

async function createTable() {
    try {
        console.log('Creating timetable table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS timetable (
                id CHAR(36) PRIMARY KEY,
                class_id CHAR(36) NOT NULL,
                teacher_id CHAR(36) NOT NULL,
                day ENUM('sat','sun','mon','tue','wed','thu') NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Timetable table created');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

createTable();
