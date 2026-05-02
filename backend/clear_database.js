const db = require('./config/database');

async function clearDatabase() {
    try {
        console.log('🧹 Clearing local database...');
        
        // Disable triggers to avoid foreign key issues during mass delete if necessary,
        // but here we just delete in order.
        await db.query('DELETE FROM notifications');
        await db.query('DELETE FROM matches');
        await db.query('DELETE FROM crush_declarations');
        await db.query('DELETE FROM email_otps');
        await db.query('DELETE FROM sessions');
        await db.query('DELETE FROM users');
        
        console.log('✅ Database cleared! You can now sign up with any email again.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error clearing database:', err.message);
        process.exit(1);
    }
}

clearDatabase();
