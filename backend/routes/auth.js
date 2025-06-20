
const express = require('express');
const db = require('../models/db');
const router = express.Router();

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, username });
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Credenciales inválidas' });
    res.json({ id: row.id, username: row.username });
  });
});

module.exports = router;
