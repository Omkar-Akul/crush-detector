const db = require('./config/database');

const action = process.argv[2];
const targetId = process.argv[3];

async function runAdminTool() {
    try {
        if (action === 'list') {
            const res = await db.query(`
                SELECT u.id, u.username, u.display_name, u.verification_type, 
                       u.college_name, u.student_id_url, u.social_link
                FROM users u
                JOIN verification_requests vr ON u.id = vr.user_id
                WHERE u.is_identity_verified = false AND vr.status = 'pending'
            `);
            
            if (res.rows.length === 0) {
                console.log('✅ No pending verification requests.');
            } else {
                console.log('🕒 Pending Verifications:');
                console.table(res.rows.map(row => ({
                    ID: row.id,
                    User: row.username,
                    Type: row.verification_type,
                    Detail: row.verification_type === 'college' ? `${row.college_name} (${row.student_id_url})` : row.social_link
                })));
                console.log('\nUse "node backend/admin_tool.js approve [ID]" to verify a user.');
            }
        } 
        else if (action === 'approve' && targetId) {
            await db.query('UPDATE users SET is_identity_verified = true WHERE id = $1', [targetId]);
            await db.query("UPDATE verification_requests SET status = 'approved', reviewed_at = NOW() WHERE user_id = $1", [targetId]);
            console.log(`✅ User ID ${targetId} has been successfully verified!`);
        }
        else {
            console.log('Usage:');
            console.log('  node backend/admin_tool.js list           - Show pending requests');
            console.log('  node backend/admin_tool.js approve [ID]   - Approve a user');
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

runAdminTool();
