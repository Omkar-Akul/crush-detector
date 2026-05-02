const db = require('./config/database');

async function setVerified() {
    try {
        const res = await db.query("UPDATE users SET is_email_verified = true WHERE username = 'omkar' RETURNING username, is_email_verified");
        if (res.rows.length > 0) {
            console.log('Success! User verified:', res.rows[0]);
        } else {
            console.log('User "omkar" not found.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

setVerified();
