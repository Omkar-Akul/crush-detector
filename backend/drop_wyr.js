require('dotenv').config();
const db = require('./config/database');

(async () => {
    try {
        await db.query('DROP TABLE IF EXISTS would_you_rather CASCADE;');
        console.log('would_you_rather table dropped. It will be recreated with 60 questions on next server start.');
    } catch(e) {
        console.log(e);
    } finally {
        process.exit(0);
    }
})();