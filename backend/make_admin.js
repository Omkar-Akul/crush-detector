const db = require('./config/database');

const username = process.argv[2];

async function makeAdmin() {
    if (!username) {
        console.log('Usage: node backend/make_admin.js <username>');
        process.exit(1);
    }

    try {
        const res = await db.query("UPDATE users SET role = 'admin' WHERE username = $1 RETURNING *", [username]);
        if (res.rows.length > 0) {
            console.log(`✅ User '${username}' is now an admin!`);
        } else {
            console.log(`❌ User '${username}' not found. Make sure you register an account first.`);
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

makeAdmin();