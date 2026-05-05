const { Client } = require('pg');

async function createDb() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Connect to default db first
    password: 'omkar9221',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Connected to postgres database. Creating crush_detector...');
    await client.query('CREATE DATABASE crush_detector');
    console.log('Database crush_detector created successfully.');
  } catch (err) {
    if (err.code === '42P04') {
        console.log('Database crush_detector already exists.');
    } else {
        console.error('Error creating database:', err.message);
    }
  } finally {
    await client.end();
  }
}

createDb();