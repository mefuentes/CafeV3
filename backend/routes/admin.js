const express = require('express');
const crypto = require('crypto');
const db = require('../models/db');
const router = express.Router();

function checkAdmin(req, res, next) {
  const id = req.header('x-user-id');
  if (!id) return res.status(401).json({ error: 'Falta ID de usuario' });
  db.get('SELECT isAdmin FROM clientes WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || row.isAdmin !== 1)
      return res.status(403).json({ error: 'Acceso denegado' });
    next();
  });
}

router.use(checkAdmin);

router.get('/users', (req, res) => {
  const search = req.query.search || '';
  const like = `%${search}%`;
  const q =
    'SELECT id, nombre, apellido, correo, isAdmin FROM clientes WHERE nombre LIKE ? OR apellido LIKE ? OR correo LIKE ?';
  db.all(q, [like, like, like], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/orders', (req, res) => {
  const q = `SELECT o.ordenId, o.usuarioId, o.metodoPago, o.creadoEn,
                    u.nombre, u.apellido,
                    COUNT(o.id) as items,
                    SUM(o.precioProducto * o.cantidad) as total
             FROM cobranzas o
             LEFT JOIN clientes u ON o.usuarioId = u.id
             GROUP BY o.ordenId
             ORDER BY o.ordenId DESC`;
  db.all(q, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/products', (req, res) => {
  const { nombre, descripcion, precio, stock } = req.body;
  db.run(
    'INSERT INTO productos (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)',
    [nombre, descripcion, precio, stock || 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/products/:id', (req, res) => {
  const { nombre, descripcion, precio, stock } = req.body;
  db.run(
    'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ? WHERE id = ?',
    [nombre, descripcion, precio, stock, req.params.id],
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

// ---- User management ----

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

router.post('/users', (req, res) => {
  const { nombre, apellido, correo, contrasena, isAdmin } = req.body;
  const hash = contrasena ? hashPassword(contrasena) : null;
  db.run(
    'INSERT INTO clientes (nombre, apellido, correo, contrasena, isAdmin) VALUES (?, ?, ?, ?, ?)',
    [nombre, apellido, correo, hash, isAdmin ? 1 : 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/users/:id', (req, res) => {
  const { nombre, apellido, correo, contrasena, isAdmin } = req.body;
  const fields = [];
  const params = [];
  if (nombre !== undefined) {
    fields.push('nombre = ?');
    params.push(nombre);
  }
  if (apellido !== undefined) {
    fields.push('apellido = ?');
    params.push(apellido);
  }
  if (correo !== undefined) {
    fields.push('correo = ?');
    params.push(correo);
  }
  if (isAdmin !== undefined) {
    fields.push('isAdmin = ?');
    params.push(isAdmin ? 1 : 0);
  }
  if (contrasena) {
    fields.push('contrasena = ?');
    params.push(hashPassword(contrasena));
  }
  if (!fields.length) return res.json({ updated: 0 });
  params.push(req.params.id);
  const q = 'UPDATE clientes SET ' + fields.join(', ') + ' WHERE id = ?';
  db.run(q, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

router.delete('/users/:id', (req, res) => {
  db.run('DELETE FROM clientes WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ---- Invoice management ----

router.get('/invoices', (req, res) => {
  const q = `SELECT f.id, f.ordenId, f.usuarioId, f.creadoEn,
                    u.nombre, u.apellido
             FROM facturas f
             LEFT JOIN clientes u ON f.usuarioId = u.id
             ORDER BY f.id DESC`;
  db.all(q, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/invoices/:id', (req, res) => {
  const { id } = req.params;
  const q = `SELECT f.id, f.ordenId, f.usuarioId, f.creadoEn,
                    u.nombre, u.apellido
             FROM facturas f
             LEFT JOIN clientes u ON f.usuarioId = u.id
             WHERE f.id = ?`;
  db.get(q, [id], (err, invoice) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    db.all(
      'SELECT nombreProducto, cantidad, precioProducto FROM cobranzas WHERE ordenId = ?',
      [invoice.ordenId],
      (err2, items) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ invoice, items });
      }
    );
  });
});

// ---- Suppliers management ----

router.get('/suppliers', (req, res) => {
  const search = req.query.search || '';
  const like = `%${search}%`;
  const q =
    'SELECT * FROM proveedores WHERE nombre LIKE ? OR correo LIKE ? OR telefono LIKE ?';
  db.all(q, [like, like, like], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/suppliers/:id', (req, res) => {
  db.get('SELECT * FROM proveedores WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(row);
  });
});

router.post('/suppliers', (req, res) => {
  const { nombre, correo, telefono } = req.body;
  if (!nombre || !correo) {
    return res.status(400).json({ error: 'Nombre y correo son obligatorios' });
  }
  if (!correo.includes('@')) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  db.run(
    'INSERT INTO proveedores (nombre, correo, telefono) VALUES (?, ?, ?)',
    [nombre, correo, telefono],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/suppliers/:id', (req, res) => {
  const { nombre, correo, telefono } = req.body;
  const fields = [];
  const params = [];
  if (nombre !== undefined) {
    fields.push('nombre = ?');
    params.push(nombre);
  }
  if (correo !== undefined) {
    if (!correo.includes('@')) {
      return res.status(400).json({ error: 'Correo electrónico inválido' });
    }
    fields.push('correo = ?');
    params.push(correo);
  }
  if (telefono !== undefined) {
    fields.push('telefono = ?');
    params.push(telefono);
  }
  if (!fields.length) return res.json({ updated: 0 });
  params.push(req.params.id);
  const q = 'UPDATE proveedores SET ' + fields.join(', ') + ' WHERE id = ?';
  db.run(q, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

router.delete('/suppliers/:id', (req, res) => {
  db.run('DELETE FROM proveedores WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ---- Purchase orders management ----

router.get('/purchase-orders', (req, res) => {
  const q = `SELECT oc.id, oc.ordenId, oc.proveedorId, oc.productoId,
                    oc.nombreProducto, oc.precioProducto, oc.cantidad,
                    oc.creadoEn, p.nombre AS proveedorNombre
             FROM ordenes_compra oc
             LEFT JOIN proveedores p ON oc.proveedorId = p.id
             ORDER BY oc.ordenId DESC`;
  db.all(q, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/purchase-orders/:ordenId', (req, res) => {
  const q = `SELECT oc.*, p.nombre AS proveedorNombre
             FROM ordenes_compra oc
             LEFT JOIN proveedores p ON oc.proveedorId = p.id
             WHERE oc.ordenId = ?`;
  db.all(q, [req.params.ordenId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(rows);
  });
});

router.post('/purchase-orders', (req, res) => {
  const { proveedorId, items } = req.body;
  if (!proveedorId || !Array.isArray(items) || !items.length)
    return res.status(400).json({ error: 'Datos incompletos' });
  db.get('SELECT COALESCE(MAX(ordenId), 0) as maxId FROM ordenes_compra', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const orderId = (row ? row.maxId : 0) + 1;
    const stmt = db.prepare(
      'INSERT INTO ordenes_compra (ordenId, proveedorId, productoId, nombreProducto, precioProducto, cantidad) VALUES (?, ?, ?, ?, ?, ?)'
    );
    let pending = items.length;
    items.forEach(it => {
      db.get('SELECT nombre FROM productos WHERE id = ?', [it.productoId], (er2, prod) => {
        if (er2) {
          pending = -1;
          return res.status(500).json({ error: er2.message });
        }
        if (!prod) {
          pending = -1;
          return res.status(400).json({ error: 'Producto no encontrado' });
        }
        stmt.run(orderId, proveedorId, it.productoId, prod.nombre, it.precioProducto, it.cantidad, function(er3) {
          if (er3) {
            pending = -1;
            return res.status(500).json({ error: er3.message });
          }
          db.run(
            'UPDATE productos SET stock = COALESCE(stock,0) + ?, precio = ? WHERE id = ?',
            [it.cantidad, it.precioProducto, it.productoId]
          );
          pending--;
          if (pending === 0) {
            stmt.finalize(e => {
              if (e) return res.status(500).json({ error: e.message });
              res.json({ orderId });
            });
          }
        });
      });
    });
  });
});

router.put('/purchase-orders/item/:id', (req, res) => {
  const { productoId, cantidad, precioProducto } = req.body;
  if (!productoId || !cantidad || !precioProducto)
    return res.status(400).json({ error: 'Datos incompletos' });
  db.get('SELECT * FROM ordenes_compra WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Item no encontrado' });
    db.get('SELECT nombre FROM productos WHERE id = ?', [productoId], (er2, prod) => {
      if (er2) return res.status(500).json({ error: er2.message });
      if (!prod) return res.status(400).json({ error: 'Producto no encontrado' });
      db.run('UPDATE productos SET stock = stock - ? WHERE id = ?', [row.cantidad, row.productoId]);
      const q = 'UPDATE ordenes_compra SET productoId = ?, nombreProducto = ?, cantidad = ?, precioProducto = ? WHERE id = ?';
      const params = [productoId, prod.nombre, cantidad, precioProducto, req.params.id];
      db.run(q, params, function(er3) {
        if (er3) return res.status(500).json({ error: er3.message });
        db.run(
          'UPDATE productos SET stock = stock + ?, precio = ? WHERE id = ?',
          [cantidad, precioProducto, productoId]
        );
        res.json({ updated: this.changes });
      });
    });
  });
});

router.delete('/purchase-orders/item/:id', (req, res) => {
  db.get('SELECT productoId, cantidad FROM ordenes_compra WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Item no encontrado' });
    db.run('UPDATE productos SET stock = stock - ? WHERE id = ?', [row.cantidad, row.productoId]);
    db.run('DELETE FROM ordenes_compra WHERE id = ?', [req.params.id], function(er2) {
      if (er2) return res.status(500).json({ error: er2.message });
      res.json({ deleted: this.changes });
    });
  });
});

router.delete('/purchase-orders/:ordenId', (req, res) => {
  const { ordenId } = req.params;
  db.all('SELECT productoId, cantidad FROM ordenes_compra WHERE ordenId = ?', [ordenId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    rows.forEach(r => {
      db.run('UPDATE productos SET stock = stock - ? WHERE id = ?', [r.cantidad, r.productoId]);
    });
    db.run('DELETE FROM ordenes_compra WHERE ordenId = ?', [ordenId], function(er2) {
      if (er2) return res.status(500).json({ error: er2.message });
      res.json({ deleted: this.changes });
    });
  });
});

module.exports = router;
