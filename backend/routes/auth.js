
const express = require('express');
const crypto = require('crypto');

// Simple password hashing using SHA-256 to avoid external dependencies
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}
const db = require('../models/db');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { nombre, apellido, correo, contrasena } = req.body;

  // Validate required fields
  if (!nombre || !apellido || !correo || !contrasena) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  if (!correo.includes('@')) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  try {
    const hash = hashPassword(contrasena);
    db.run(
      'INSERT INTO clientes (nombre, apellido, correo, contrasena) VALUES (?, ?, ?, ?)',
      [nombre, apellido, correo, hash],
      function (err) {
        if (err) {
          if (
            err.code === 'SQLITE_CONSTRAINT' &&
            err.message.includes('clientes.correo')
          ) {
            return res
              .status(400)
              .json({ error: 'Correo electrónico ya existente' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, correo });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', (req, res) => {
  const { correo, contrasena } = req.body;
  db.get('SELECT * FROM clientes WHERE correo = ?', [correo], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Credenciales inválidas' });
    const match = hashPassword(contrasena) === row.contrasena;
    if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });
    res.json({
      id: row.id,
      correo: row.correo,
      nombre: row.nombre,
      apellido: row.apellido,
      isAdmin: row.isAdmin
    });
  });
});

module.exports = router;
