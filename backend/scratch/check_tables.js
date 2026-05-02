const db = require('../config/database');

async function checkTables() {
    try {
        const tables = ['users', 'email_otps', 'sessions', 'verification_requests', 'matches', 'notifications'];
        for (const table of tables) {
            const res = await db.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table]);
            console.log(`Table '${table}' exists: ${res.rows[0].exists}`);
        }
        process.exit(0);
    } catch (err) {
        console.error('Error checking tables:', err.message);
        process.exit(1);
    }
}

checkTables();
