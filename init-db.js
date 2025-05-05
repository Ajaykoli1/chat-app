const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgres://chat_app_db_1l26_user:B1KFuJlKT1nP5XUk0MiEzlZJEAFxr6Pt@dpg-d0c59s1r0fns73e2lgf0-a.oregon-postgres.render.com/chat_app_db_1l26',
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  try {
    // Read the schema file
    const schema = fs.readFileSync('schema.sql', 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .filter(statement => statement.trim())
      .map(statement => statement + ';');

    // Execute each statement
    for (const statement of statements) {
      await pool.query(statement);
      console.log('Executed:', statement.trim());
    }

    console.log('Database initialized successfully!');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
  }
}

initDatabase(); 