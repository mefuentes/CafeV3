
const express = require('express');
const db = require('../models/db');
const router = express.Router();

router.post('/cart', (req, res) => {
  const { userId, productId, quantity } = req.body;
  db.run('INSERT INTO cart (userId, productId, quantity) VALUES (?, ?, ?)', [userId, productId, quantity], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
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
