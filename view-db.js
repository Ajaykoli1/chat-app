const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://chat_app_db_1l26_user:B1KFuJlKT1nP5XUk0MiEzlZJEAFxr6Pt@dpg-d0c59s1r0fns73e2lgf0-a.oregon-postgres.render.com/chat_app_db_1l26',
  ssl: { rejectUnauthorized: false }
});

async function viewDatabase() {
  try {
    // View users table
    console.log('\n=== Users Table ===');
    const usersResult = await pool.query('SELECT id, username, created_at FROM users');
    console.table(usersResult.rows);

    // View messages table
    console.log('\n=== Messages Table ===');
    const messagesResult = await pool.query('SELECT id, "user", msg, created_at FROM messages ORDER BY created_at DESC');
    console.table(messagesResult.rows);

  } catch (err) {
    console.error('Error viewing database:', err);
  } finally {
    await pool.end();
  }
}

viewDatabase(); 