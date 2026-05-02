const db = require('./config/database');

async function clearDatabase() {
    console.log('⚠️ WARNING: Preparing to clear the database...');
    
    try {
        // We use TRUNCATE with CASCADE to clear all tables and reset IDs
        await db.query(`
            TRUNCATE TABLE 
                users, 
                crushes, 
                matches, 
                profile_views, 
                notifications, 
                sessions, 
                email_otps, 
                verification_requests 
            RESTART IDENTITY CASCADE
        `);
        
        console.log('✅ SUCCESS: All live data has been cleared and IDs reset.');
        process.exit(0);
    } catch (err) {
        console.error('❌ ERROR: Failed to clear database:', err.message);
        process.exit(1);
    }
}

// Simple confirmation check
console.log('Type "yes" to confirm clearing the LIVE database:');
process.stdin.on('data', (data) => {
    if (data.toString().trim().toLowerCase() === 'yes') {
        clearDatabase();
    } else {
        console.log('❌ Aborted.');
        process.exit(0);
    }
});
