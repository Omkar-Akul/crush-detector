const db = require('./config/database');
const bcrypt = require('bcryptjs');

async function setPassword() {
    try {
        const hash = '$2a$10$lxSi1/qDoOxcV53S9fP9v.4mL7gC6rbRXxJStiZ.z9.izCwXdlAUS'; // test123
        const res = await db.query(
            "UPDATE users SET password_hash = $1 WHERE username = 'omkar' RETURNING username",
            [hash]
        );
        console.log('Password updated for:', res.rows[0]?.username);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

setPassword();
