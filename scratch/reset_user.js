const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const db = require('../backend/config/database');

async function resetVerification() {
    try {
        const res = await db.query("UPDATE users SET is_email_verified = false WHERE username = 'omkar' RETURNING username, is_email_verified");
        if (res.rows.length > 0) {
            console.log('Success! User reset:', res.rows[0]);
        } else {
            console.log('User "omkar" not found.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

resetVerification();
