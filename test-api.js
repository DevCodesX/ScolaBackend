/**
 * Quick API test script
 * Run: node test-api.js
 */
const http = require('http');

function request(method, path, data) {
    return new Promise((resolve, reject) => {
        const body = data ? JSON.stringify(data) : null;
        const opts = {
            hostname: 'localhost',
            port: 4000,
            path,
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);

        const req = http.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
                catch { resolve({ status: res.statusCode, body: d }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function test() {
    console.log('🧪 Testing Scola API\n');

    // 1. Health check
    try {
        const r = await request('GET', '/');
        console.log(`1. Health check: ${r.status === 200 ? '✅' : '❌'} (${r.status})`);
        console.log(`   ${JSON.stringify(r.body)}`);
    } catch (e) {
        console.log('1. Health check: ❌ Server not running');
        process.exit(1);
    }

    // 2. DB check
    const dbRes = await request('GET', '/api/test-db');
    console.log(`\n2. DB check: ${dbRes.status === 200 ? '✅' : '❌'} (${dbRes.status})`);
    console.log(`   ${JSON.stringify(dbRes.body)}`);

    // 3. Login as admin
    const loginRes = await request('POST', '/api/auth/login', {
        email: 'admin@scola.com',
        password: 'password123'
    });
    console.log(`\n3. Login (admin): ${loginRes.status === 200 ? '✅' : '❌'} (${loginRes.status})`);
    console.log(`   User: ${JSON.stringify(loginRes.body.user)}`);
    console.log(`   Token: ${loginRes.body.token ? loginRes.body.token.substring(0, 30) + '...' : 'NONE'}`);

    // 4. Register a free teacher
    const teacherRes = await request('POST', '/api/iam/register-teacher', {
        first_name: 'Ahmed',
        last_name: 'Ali',
        email: 'ahmed@test.com',
        password: 'password123',
        qualification: 'bachelor',
        subject: 'Mathematics'
    });
    console.log(`\n4. Register teacher: ${teacherRes.status === 201 ? '✅' : '❌'} (${teacherRes.status})`);
    console.log(`   ${JSON.stringify(teacherRes.body)}`);

    // 5. Login as teacher
    const teacherLogin = await request('POST', '/api/auth/login', {
        email: 'ahmed@test.com',
        password: 'password123'
    });
    console.log(`\n5. Login (teacher): ${teacherLogin.status === 200 ? '✅' : '❌'} (${teacherLogin.status})`);
    console.log(`   User: ${JSON.stringify(teacherLogin.body.user)}`);

    // 6. Register institution
    const instRes = await request('POST', '/api/iam/register-institution', {
        institution_name: 'Future Academy',
        admin_name: 'Mohamed',
        admin_email: 'future@test.com',
        admin_password: 'password123'
    });
    console.log(`\n6. Register institution: ${instRes.status === 201 ? '✅' : '❌'} (${instRes.status})`);
    console.log(`   ${JSON.stringify(instRes.body)}`);

    // 7. Login as institution admin
    const instLogin = await request('POST', '/api/auth/login', {
        email: 'future@test.com',
        password: 'password123'
    });
    console.log(`\n7. Login (institution): ${instLogin.status === 200 ? '✅' : '❌'} (${instLogin.status})`);
    console.log(`   User: ${JSON.stringify(instLogin.body.user)}`);

    console.log('\n🏁 All tests complete!');
}

test().catch(e => console.error('Test error:', e.message));
