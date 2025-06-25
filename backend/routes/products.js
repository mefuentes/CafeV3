
const express = require('express');
const db = require('../models/db');
const router = express.Router();

router.get('/products', (req, res) => {
  const search = req.query.search;
  const params = [];
  let sql = 'SELECT * FROM productos';
  if (search) {
    sql += ' WHERE nombre LIKE ?';
    params.push(`%${search}%`);
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
