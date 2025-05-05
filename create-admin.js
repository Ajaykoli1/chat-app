const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgres://chat_app_db_1l26_user:B1KFuJlKT1nP5XUk0MiEzlZJEAFxr6Pt@dpg-d0c59s1r0fns73e2lgf0-a.oregon-postgres.render.com/chat_app_db_1l26',
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  try {
    // Check if admin column exists, if not add it
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='users' AND column_name='is_admin'
        ) THEN
          ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);

    // Set the specified user as admin
    const username = 'Ajay'; // Change this to the username you want to make admin
    const result = await pool.query(
      'UPDATE users SET is_admin = TRUE WHERE username = $1 RETURNING username, is_admin',
      [username]
    );

    if (result.rows.length > 0) {
      console.log(`Successfully set ${username} as admin`);
    } else {
      console.log(`User ${username} not found`);
    }
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    await pool.end();
  }
}

createAdmin(); 