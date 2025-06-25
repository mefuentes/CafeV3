const express = require('express');
const crypto = require('crypto');
const db = require('../models/db');
const router = express.Router();

function checkAdmin(req, res, next) {
  const id = req.header('x-user-id');
  if (!id) return res.status(401).json({ error: 'Falta ID de usuario' });
  db.get('SELECT isAdmin FROM usuarios WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || row.isAdmin !== 1)
      return res.status(403).json({ error: 'Acceso denegado' });
    next();
  });
}

router.use(checkAdmin);

router.get('/users', (req, res) => {
  const search = req.query.search || '';
  const like = `%${search}%`;
  const q =
    'SELECT id, nombre, apellido, correo, isAdmin FROM usuarios WHERE nombre LIKE ? OR apellido LIKE ? OR correo LIKE ?';
  db.all(q, [like, like, like], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/orders', (req, res) => {
  const q = `SELECT o.ordenId, o.usuarioId, o.nombreProducto, o.precioProducto,
                    o.cantidad, o.metodoPago, o.creadoEn,
                    u.nombre, u.apellido
             FROM ordenes o
             LEFT JOIN usuarios u ON o.usuarioId = u.id
             ORDER BY o.ordenId DESC`;
  db.all(q, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/products', (req, res) => {
  const { nombre, descripcion, precio } = req.body;
  db.run(
    'INSERT INTO productos (nombre, descripcion, precio) VALUES (?, ?, ?)',
    [nombre, descripcion, precio],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/products/:id', (req, res) => {
  const { nombre, descripcion, precio } = req.body;
  db.run(
    'UPDATE productos SET nombre = ?, descripcion = ?, precio = ? WHERE id = ?',
    [nombre, descripcion, precio, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

router.delete('/products/:id', (req, res) => {
  db.run('DELETE FROM productos WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ---- User management ----

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

router.post('/users', (req, res) => {
  const { nombre, apellido, correo, contrasena, isAdmin } = req.body;
  const hash = contrasena ? hashPassword(contrasena) : null;
  db.run(
    'INSERT INTO usuarios (nombre, apellido, correo, contrasena, isAdmin) VALUES (?, ?, ?, ?, ?)',
    [nombre, apellido, correo, hash, isAdmin ? 1 : 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/users/:id', (req, res) => {
  const { nombre, apellido, correo, contrasena, isAdmin } = req.body;
  const fields = [];
  const params = [];
  if (nombre !== undefined) {
    fields.push('nombre = ?');
    params.push(nombre);
  }
  if (apellido !== undefined) {
    fields.push('apellido = ?');
    params.push(apellido);
  }
  if (correo !== undefined) {
    fields.push('correo = ?');
    params.push(correo);
  }
  if (isAdmin !== undefined) {
    fields.push('isAdmin = ?');
    params.push(isAdmin ? 1 : 0);
  }
  if (contrasena) {
    fields.push('contrasena = ?');
    params.push(hashPassword(contrasena));
  }
  if (!fields.length) return res.json({ updated: 0 });
  params.push(req.params.id);
  const q = 'UPDATE usuarios SET ' + fields.join(', ') + ' WHERE id = ?';
  db.run(q, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

router.delete('/users/:id', (req, res) => {
  db.run('DELETE FROM usuarios WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
