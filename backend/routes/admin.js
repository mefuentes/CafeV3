const express = require('express');
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
  db.all('SELECT id, nombre, apellido, correo, isAdmin FROM usuarios', (err, rows) => {
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

module.exports = router;
