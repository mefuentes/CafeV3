const express = require('express');
const db = require('../models/db');
const router = express.Router();

// Crear una nueva cobranza / orden
router.post('/cobranzas', (req, res) => {
  const { usuarioId, items, metodoPago } = req.body;
  if (!usuarioId || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  db.get('SELECT COALESCE(MAX(ordenId), 0) as maxId FROM ordenes', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const orderId = (row ? row.maxId : 0) + 1;
    const stmt = db.prepare(
      'INSERT INTO ordenes (ordenId, usuarioId, productoId, nombreProducto, precioProducto, cantidad, metodoPago) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    let pending = items.length;
    items.forEach(it => {
      db.get('SELECT nombre, precio FROM productos WHERE id = ?', [it.productoId], (er2, prod) => {
        if (er2) {
          pending = -1;
          return res.status(500).json({ error: er2.message });
        }
        if (!prod) {
          pending = -1;
          return res.status(400).json({ error: 'Producto no encontrado' });
        }
        stmt.run(orderId, usuarioId, it.productoId, prod.nombre, prod.precio, it.cantidad, metodoPago, function(er3) {
          if (er3) {
            pending = -1;
            return res.status(500).json({ error: er3.message });
          }
          pending--;
          if (pending === 0) {
            stmt.finalize(e => {
              if (e) return res.status(500).json({ error: e.message });
              res.status(201).json({ orderId });
            });
          }
        });
      });
    });
  });
});

// Obtener listado de cobranzas
router.get('/cobranzas', (req, res) => {
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

// Consulta de una cobranza por ID
router.get('/cobranzas/:ordenId', (req, res) => {
  const { ordenId } = req.params;
  const q = `SELECT * FROM ordenes WHERE ordenId = ?`;
  db.all(q, [ordenId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Cobranza no encontrada' });
    res.json(rows);
  });
});

// Modificar metodo de pago de una cobranza
router.put('/cobranzas/:ordenId', (req, res) => {
  const { metodoPago } = req.body;
  if (!metodoPago) return res.status(400).json({ error: 'Metodo de pago requerido' });
  db.run('UPDATE ordenes SET metodoPago = ? WHERE ordenId = ?', [metodoPago, req.params.ordenId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Cobranza no encontrada' });
    res.json({ updated: this.changes });
  });
});

// Eliminar una cobranza
router.delete('/cobranzas/:ordenId', (req, res) => {
  const { ordenId } = req.params;
  db.run('DELETE FROM facturas WHERE ordenId = ?', [ordenId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM ordenes WHERE ordenId = ?', [ordenId], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      if (!this.changes) return res.status(404).json({ error: 'Cobranza no encontrada' });
      res.json({ deleted: this.changes });
    });
  });
});

module.exports = router;
