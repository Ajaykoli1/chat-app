const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images and common document types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// PostgreSQL connection setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://chat_app_db_1l26_user:B1KFuJlKT1nP5XUk0MiEzlZJEAFxr6Pt@dpg-d0c59s1r0fns73e2lgf0-a.oregon-postgres.render.com/chat_app_db_1l26',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('PostgreSQL connection error:', err);
    process.exit(1);
  }
  console.log('Connected to PostgreSQL database.');
  release();
});

// Serve static files from the public folder
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  console.log('File upload request received:', req.file);
  
  if (!req.file) {
    console.error('No file in request');
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log('File uploaded successfully:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });
    
    res.json({
      success: true,
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype
    });
  } catch (error) {
    console.error('Error processing file upload:', error);
    res.status(500).json({ error: 'Error processing file upload' });
  }
});

// Registration endpoint
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2)',
      [username, hashedPassword]
    );
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ 
      success: true, 
      username: user.username,
      isAdmin: user.is_admin 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Clear chat history endpoint (admin only)
app.post('/clear-chat-history', async (req, res) => {
  const { username, isAdmin } = req.body;
  
  if (!username || !isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    // Verify user is admin
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Clear messages
    await pool.query('DELETE FROM messages');
    io.emit('chat history', []); // Notify all clients to clear their chat display
    res.json({ success: true });
  } catch (err) {
    console.error('Error clearing chat history:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A user connected');

  // Send last 20 messages to the newly connected client
  pool.query(
    'SELECT "user", msg, created_at, file_url, file_name, file_type FROM messages ORDER BY id DESC LIMIT 20',
    (err, results) => {
      if (!err) {
        socket.emit('chat history', results.rows.reverse());
      } else {
        console.error('Error fetching chat history:', err);
      }
    }
  );

  socket.on('chat message', async (data) => {
    try {
      // Save message to DB
      await pool.query(
        'INSERT INTO messages ("user", msg, file_url, file_name, file_type) VALUES ($1, $2, $3, $4, $5)',
        [data.user, data.msg, data.fileUrl, data.fileName, data.fileType]
      );
      io.emit('chat message', data);
    } catch (err) {
      console.error('Failed to save message:', err);
    }
  });

  socket.on('typing', (user) => {
    socket.broadcast.emit('typing', user);
  });

  socket.on('request chat history', () => {
    pool.query(
      'SELECT "user", msg, created_at, file_url, file_name, file_type FROM messages ORDER BY id DESC LIMIT 20',
      (err, results) => {
        if (!err) {
          socket.emit('chat history', results.rows.reverse());
        } else {
          console.error('Error fetching chat history:', err);
        }
      }
    );
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
