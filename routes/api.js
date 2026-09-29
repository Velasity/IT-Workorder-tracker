const express = require('express');
const router = express.Router();

// Get all users (returns id, name, role)
router.get('/users', (req, res) => {
  req.db.all("SELECT id, name, role FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new user
router.post('/users', (req, res) => {
  const { name, role } = req.body;
  if (!name || !role) return res.status(400).json({ error: "Name and role are required" });

  req.db.run("INSERT INTO users (name, role) VALUES (?, ?)", [name, role], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'User added successfully' });
  });
});

// Delete a user by ID
router.delete('/users/:id', (req, res) => {
  const id = req.params.id;
  req.db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'User deleted successfully', changes: this.changes });
  });
});

// Get all projects / workorders
router.get('/projects', (req, res) => {
  const query = `
    SELECT p.*, u.name as staff_name 
    FROM projects p 
    LEFT JOIN users u ON p.assigned_staff_id = u.id
    ORDER BY p.id DESC
  `;
  req.db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create Project / PC Deployment / Onboarding Workorder (Updated with Hardware Fields)
router.post('/projects', (req, res) => {
  const { title, description, assigned_staff_id, type, client_name, priority, asset_tag, serial_number, specs } = req.body;
  const query = `INSERT INTO projects (title, description, assigned_staff_id, type, client_name, status, priority, asset_tag, serial_number, specs) VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?)`;
  
  req.db.run(query, [
    title, 
    description, 
    assigned_staff_id || null, 
    type || 'IT Project', 
    client_name || 'Internal', 
    priority || 'Medium',
    asset_tag || '',
    serial_number || '',
    specs || ''
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Created successfully' });
  });
});

// Delete a project/ticket by ID
router.delete('/projects/:id', (req, res) => {
  const id = req.params.id;
  req.db.run("DELETE FROM projects WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Project deleted successfully', changes: this.changes });
  });
});

// Update project status (Staff or Manager updates real-time tracking)
router.patch('/projects/:id', (req, res) => {
  const { status, assigned_staff_id } = req.body;
  const id = req.params.id;

  let query = "UPDATE projects SET ";
  let params = [];
  let updates = [];

  if (status) {
    updates.push("status = ?");
    params.push(status);
  }
  if (assigned_staff_id !== undefined) {
    updates.push("assigned_staff_id = ?");
    params.push(assigned_staff_id);
  }

  query += updates.join(", ") + " WHERE id = ?";
  params.push(id);

  req.db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Updated successfully', changes: this.changes });
  });
});

module.exports = router;