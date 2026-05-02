const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('render.com')) 
            ? { rejectUnauthorized: false } 
            : false
    }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
        ssl: false
    };

const pool = new Pool(poolConfig);


module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
