const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations/create_messages_table.sql'), 'utf8');
        await db.query(sql);
        console.log('✅ Messages table added to database!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();