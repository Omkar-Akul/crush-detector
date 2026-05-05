const fs = require('fs');
const { Client } = require('pg');
const path = require('path');

async function createSchema() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'crush_detector',
    password: 'omkar9221',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Connected to crush_detector database. Creating schema...');
    
    const schemaFile = path.join(__dirname, 'DATABASE_SCHEMA.sql');
    if (fs.existsSync(schemaFile)) {
        const schema = fs.readFileSync(schemaFile, 'utf8');
        await client.query(schema);
        console.log('Database schema created successfully.');
    } else {
        console.log('DATABASE_SCHEMA.sql not found at ' + schemaFile);
    }
  } catch (err) {
    console.error('Error creating schema:', err);
  } finally {
    await client.end();
  }
}

createSchema();