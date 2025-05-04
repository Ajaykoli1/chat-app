const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

// MySQL connection setup
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Ajay1234@',
  database: process.env.DB_NAME || 'chat_app'
});

db.connect((err) => {
  if (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database.');
});

// Serve static files from the public folder
app.use(express.static('public'));

// Registration endpoint
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  const hashedPassword = bcrypt.hashSync(password, 10);
  db.query(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, hashedPassword],
    (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true });
    }
  );
});

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

      const user = results[0];
      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      res.json({ success: true, username: user.username });
    }
  );
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A user connected');

  // Send last 20 messages to the newly connected client
  db.query(
    'SELECT user, msg, created_at FROM messages ORDER BY id DESC LIMIT 20',
    (err, results) => {
      if (!err) {
        socket.emit('chat history', results.reverse());
      }
    }
  );

  socket.on('chat message', (data) => {
    // Save message to DB
    db.query(
      'INSERT INTO messages (user, msg) VALUES (?, ?)',
      [data.user, data.msg],
      (err) => {
        if (err) {
          console.error('Failed to save message:', err);
        }
      }
    );
    io.emit('chat message', data);
  });

  socket.on('typing', (user) => {
    socket.broadcast.emit('typing', user);
  });

  socket.on('request chat history', () => {
    db.query(
      'SELECT user, msg, created_at FROM messages ORDER BY id DESC LIMIT 20',
      (err, results) => {
        if (!err) {
          socket.emit('chat history', results.reverse());
        }
      }
    );
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
