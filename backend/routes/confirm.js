
const express = require('express');
const db = require('../models/db');
const router = express.Router();

router.post('/confirm', (req, res) => {
  const { userId } = req.body;

  const q = `
    SELECT c.productId, c.quantity, p.name, p.price
    FROM cart c
    JOIN products p ON c.productId = p.id
    WHERE c.userId = ?
  `;

  db.all(q, [userId], (err, items) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!items.length) {
      return res.json({ message: "No hay productos en el carrito." });
    }

    const stmt = db.prepare(
      'INSERT INTO orders (userId, productId, productName, productPrice, quantity) VALUES (?, ?, ?, ?, ?)'
    );
    items.forEach(i => {
      stmt.run(userId, i.productId, i.name, i.price, i.quantity);
    });
    stmt.finalize(err => {
      if (err) return res.status(500).json({ error: err.message });

      db.run('DELETE FROM cart WHERE userId = ?', [userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Compra confirmada y registrada." });
      });
    });
  });
});

module.exports = router;
