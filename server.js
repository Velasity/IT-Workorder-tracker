const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const dbFile = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to local SQLite database.');
  }
});

// Initialize Tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'Staff' -- 'Admin' or 'Staff'
  )`);

  // Seed initial default users if table is empty
  db.get(`SELECT count(*) as count FROM users`, (err, row) => {
    if (err) {
      console.error('Error checking users count:', err.message);
      return;
    }
    if (row.count === 0) {
      db.run(`INSERT INTO users (name, role) VALUES ('Alice Admin', 'Admin')`);
      db.run(`INSERT INTO users (name, role) VALUES ('Bob Tech', 'Staff')`);
      console.log('Default users seeded.');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    assigned_staff_id INTEGER,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed'
    type TEXT DEFAULT 'Project', -- 'Project', 'PC Deployment', 'Onboarding Workorder'
    client_name TEXT,
    priority TEXT DEFAULT 'Medium',
    asset_tag TEXT,
    serial_number TEXT,
    specs TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(assigned_staff_id) REFERENCES users(id)
  )`);
});

// Pass db to routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Fallback to frontend
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`IT Management App running locally at http://localhost:${PORT}`);
});