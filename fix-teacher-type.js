// Quick fix: update existing free teachers in DB
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'db',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'scola',
    });

    const [r] = await pool.query("UPDATE teachers SET teacher_type = 'free' WHERE institution_id IS NULL");
    console.log('Updated', r.affectedRows, 'teachers to free');

    const [rows] = await pool.query('SELECT id, first_name, last_name, teacher_type, institution_id FROM teachers');
    rows.forEach(t => console.log(`  ${t.first_name} ${t.last_name}: type=${t.teacher_type}, inst=${t.institution_id || 'NULL'}`));

    await pool.end();
})();
