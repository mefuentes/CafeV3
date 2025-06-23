
const express = require('express');
const db = require('../models/db');
const router = express.Router();

router.post('/cart', (req, res) => {
  const { usuarioId, productoId, cantidad } = req.body;

  // Check if the product already exists in the user's cart
  db.get(
    'SELECT id, cantidad FROM carrito WHERE usuarioId = ? AND productoId = ?',
    [usuarioId, productoId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      if (row) {
        // If it exists, update the quantity
        const newQty = row.cantidad + cantidad;
        db.run(
          'UPDATE carrito SET cantidad = ? WHERE id = ?',
          [newQty, row.id],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: row.id, cantidad: newQty, updated: true });
          }
        );
      } else {
        // Otherwise insert a new record
        db.run(
          'INSERT INTO carrito (usuarioId, productoId, cantidad) VALUES (?, ?, ?)',
          [usuarioId, productoId, cantidad],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, cantidad, inserted: true });
          }
        );
      }
    }
  );
});

router.get('/cart', (req, res) => {
  const { usuarioId } = req.query;
  db.all(`
    SELECT c.id, p.nombre, p.precio, c.cantidad
    FROM carrito c
    JOIN productos p ON c.productoId = p.id
    WHERE c.usuarioId = ?
  `, [usuarioId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.delete('/cart/:itemId', (req, res) => {
  const { itemId } = req.params;
  db.run('DELETE FROM carrito WHERE id = ?', [itemId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
