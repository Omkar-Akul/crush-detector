const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'omkar9221', host: 'localhost', port: 5432, database: 'postgres' });
pool.query('SELECT datname FROM pg_database;', (err, res) => {
    if (err) console.error(err);
    else console.log(res.rows.map(r => r.datname));
    pool.end();
});
