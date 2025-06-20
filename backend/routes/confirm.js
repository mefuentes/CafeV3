
const express = require('express');
const db = require('../models/db');
const router = express.Router();

router.post('/confirm', (req, res) => {
  const { userId } = req.body;
  db.serialize(() => {
    db.run(
      `INSERT INTO orders (userId, productId, quantity)
       SELECT userId, productId, quantity FROM cart WHERE userId = ?`,
      [userId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.run('DELETE FROM cart WHERE userId = ?', [userId], function (delErr) {
          if (delErr) return res.status(500).json({ error: delErr.message });
          res.json({ message: 'Compra confirmada.' });
        });
      }
    );
  });
});

module.exports = router;
