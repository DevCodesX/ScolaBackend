/**
 * Script to create/reset admin user for local development
 * Run: node create-admin.js
 * 
 * Creates an institution_admin user + a test institution
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuid } = require('uuid');

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '112002',
    database: process.env.DB_NAME || 'scola',
};

async function main() {
    let conn;
    try {
        console.log('Connecting to database...');
        conn = await mysql.createConnection(config);
        console.log('✅ Connected!\n');

        const adminEmail = 'admin@scola.com';
        const adminPassword = 'password123';
        const institutionName = 'Scola Test Academy';

        // Check if admin exists
        const [existing] = await conn.query(
            'SELECT id FROM users WHERE email = ?',
            [adminEmail]
        );

        if (existing.length > 0) {
            // Reset password
            const hashedPassword = await bcrypt.hash(adminPassword, 12);
            await conn.query(
                'UPDATE users SET password_hash = ? WHERE email = ?',
                [hashedPassword, adminEmail]
            );
            console.log('⚠️  Admin user exists. Password reset to:', adminPassword);

            // Check if institution exists
            const [inst] = await conn.query(
                'SELECT id FROM institutions WHERE owner_user_id = ?',
                [existing[0].id]
            );
            if (inst.length) {
                console.log('   Institution ID:', inst[0].id);
            }
        } else {
            // Create new admin + institution in a transaction
            const userId = uuid();
            const institutionId = uuid();
            const hashedPassword = await bcrypt.hash(adminPassword, 12);

            await conn.beginTransaction();

            try {
                // 1. Create user
                await conn.query(
                    `INSERT INTO users (id, email, password_hash, role) 
                     VALUES (?, ?, ?, 'institution_admin')`,
                    [userId, adminEmail, hashedPassword]
                );

                // 2. Create institution
                await conn.query(
                    `INSERT INTO institutions (id, name, owner_user_id) VALUES (?, ?, ?)`,
                    [institutionId, institutionName, userId]
                );

                await conn.commit();
            } catch (txErr) {
                await conn.rollback();
                throw txErr;
            }

            console.log('✅ Admin user created!');
            console.log(`   User ID: ${userId}`);
            console.log(`   Institution: ${institutionName} (${institutionId})`);
        }

        // Verify login
        console.log('\n--- Verifying login ---');
        const [rows] = await conn.query('SELECT * FROM users WHERE email = ?', [adminEmail]);
        const user = rows[0];
        const isMatch = await bcrypt.compare(adminPassword, user.password_hash);
        console.log(`Password verification: ${isMatch ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Role: ${user.role}`);

        console.log('\n✅ Done! Login with:');
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error('MySQL is not running! Start MySQL first.');
        }
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

main();
