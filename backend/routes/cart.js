
const express = require('express');
const db = require('../models/db');
const router = express.Router();

router.post('/cart', (req, res) => {
  const { usuarioId, productoId, cantidad } = req.body;

  db.get('SELECT stock FROM productos WHERE id = ?', [productoId], (err, prod) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });
    if (!prod.stock || prod.stock <= 0)
      return res.status(400).json({ error: 'No hay en stock' });

    // Check if the product already exists in the user's cart
    db.get(
      'SELECT id, cantidad FROM carrito WHERE usuarioId = ? AND productoId = ?',
      [usuarioId, productoId],
      (err2, row) => {
        if (err2) return res.status(500).json({ error: err2.message });

        if (row) {
          const newQty = row.cantidad + cantidad;
          db.run(
            'UPDATE carrito SET cantidad = ? WHERE id = ?',
            [newQty, row.id],
            function (er3) {
              if (er3) return res.status(500).json({ error: er3.message });
              res.json({ id: row.id, cantidad: newQty, updated: true });
            }
          );
        } else {
          db.run(
            'INSERT INTO carrito (usuarioId, productoId, cantidad) VALUES (?, ?, ?)',
            [usuarioId, productoId, cantidad],
            function (er3) {
              if (er3) return res.status(500).json({ error: er3.message });
              res.json({ id: this.lastID, cantidad, inserted: true });
            }
          );
        }
      }
    );
  });
});

router.get('/cart', (req, res) => {
  const { usuarioId } = req.query;
  db.all(
    `SELECT c.id, c.productoId, p.nombre, p.precio, c.cantidad, p.stock
     FROM carrito c
     JOIN productos p ON c.productoId = p.id
     WHERE c.usuarioId = ?`,
    [usuarioId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.delete('/cart/:itemId', (req, res) => {
  const { itemId } = req.params;
  db.run('DELETE FROM carrito WHERE id = ?', [itemId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
