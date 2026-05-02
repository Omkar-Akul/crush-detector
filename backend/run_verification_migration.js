const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations/add_verification_fields.sql'), 'utf8');
        await db.query(sql);
        console.log('✅ Verification fields added to database!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
