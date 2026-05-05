const db = require('./config/database');

async function fixPaths() {
    try {
        const users = await db.query('SELECT id, student_id_url, profile_photo_url FROM users');
        for (const user of users.rows) {
            let updated = false;
            let newStudentIdUrl = user.student_id_url;
            let newProfilePhotoUrl = user.profile_photo_url;

            if (newStudentIdUrl && newStudentIdUrl.includes('crush-detector')) {
                const parts = newStudentIdUrl.split(/[\/\\]/);
                const filename = parts[parts.length - 1];
                newStudentIdUrl = '/uploads/' + filename;
                updated = true;
            }

            if (newProfilePhotoUrl && newProfilePhotoUrl.includes('crush-detector')) {
                const parts = newProfilePhotoUrl.split(/[\/\\]/);
                const filename = parts[parts.length - 1];
                newProfilePhotoUrl = '/uploads/' + filename;
                updated = true;
            }

            if (updated) {
                await db.query(
                    'UPDATE users SET student_id_url = $1, profile_photo_url = $2 WHERE id = $3',
                    [newStudentIdUrl, newProfilePhotoUrl, user.id]
                );
            }
        }
        console.log('✅ Fixed database image paths!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixPaths();