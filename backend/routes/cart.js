
const express = require('express');
const db = require('../models/db');
const router = express.Router();

router.post('/cart', (req, res) => {
  const { userId, productId, quantity } = req.body;

  // Check if the product already exists in the user's cart
  db.get(
    'SELECT id, quantity FROM cart WHERE userId = ? AND productId = ?',
    [userId, productId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      if (row) {
        // If it exists, update the quantity
        const newQty = row.quantity + quantity;
        db.run(
          'UPDATE cart SET quantity = ? WHERE id = ?',
          [newQty, row.id],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: row.id, quantity: newQty, updated: true });
          }
        );
      } else {
        // Otherwise insert a new record
        db.run(
          'INSERT INTO cart (userId, productId, quantity) VALUES (?, ?, ?)',
          [userId, productId, quantity],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, quantity, inserted: true });
          }
        );
      }
    }
  );
});

router.get('/cart', (req, res) => {
  const { userId } = req.query;
  db.all(`
    SELECT c.id, p.name, p.price, c.quantity
    FROM cart c
    JOIN products p ON c.productId = p.id
    WHERE c.userId = ?
  `, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.delete('/cart/:itemId', (req, res) => {
  const { itemId } = req.params;
  db.run('DELETE FROM cart WHERE id = ?', [itemId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
