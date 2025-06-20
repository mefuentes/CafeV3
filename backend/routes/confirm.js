
const express = require('express');
const db = require('../models/db');
const router = express.Router();

router.post('/confirm', (req, res) => {
  const { userId } = req.body;
  db.run('DELETE FROM cart WHERE userId = ?', [userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Compra confirmada y carrito vaciado." });
  });
});

module.exports = router;
