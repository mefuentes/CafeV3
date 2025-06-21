
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../models/db');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { nombre, apellido, correo, contrasena } = req.body;
  if (!correo || !correo.includes('@')) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  try {
    const hash = await bcrypt.hash(contrasena, 10);
    db.run(
      'INSERT INTO users (nombre, apellido, correo, contrasena) VALUES (?, ?, ?, ?)',
      [nombre, apellido, correo, hash],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, correo });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', (req, res) => {
  const { correo, contrasena } = req.body;
  db.get('SELECT * FROM users WHERE correo = ?', [correo], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Credenciales inválidas' });
    const match = await bcrypt.compare(contrasena, row.contrasena);
    if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });
    res.json({ id: row.id, correo: row.correo, nombre: row.nombre, apellido: row.apellido });
  });
});

module.exports = router;
