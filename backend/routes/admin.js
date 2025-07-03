const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../models/db');

// Generador simple de PDF reutilizado de confirmar.js
function createPdf(lines) {
  const objs = [];
  const fontIndex =
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>') - 1;
  const contentLines = lines
    .map((l, i) => `1 0 0 1 50 ${750 - i * 20} Tm (${l.replace(/[()]/g, '')}) Tj`)
    .join('\n');
  const streamContent = `BT\n/F1 14 Tf\n${contentLines}\nET`;
  const contentsIndex =
    objs.push(
      `<< /Length ${Buffer.byteLength(streamContent)} >>\nstream\n${streamContent}\nendstream`
    ) - 1;
  const pageIndex =
    objs.push(
      `<< /Type /Page /Parent 4 0 R /MediaBox [0 0 612 792] /Contents ${
        contentsIndex + 1
      } 0 R /Resources << /Font << /F1 ${fontIndex + 1} 0 R >> >> >>`
    ) - 1;
  const pagesIndex =
    objs.push(`<< /Type /Pages /Kids [${pageIndex + 1} 0 R] /Count 1 >>`) - 1;
  const catalogIndex =
    objs.push(`<< /Type /Catalog /Pages ${pagesIndex + 1} 0 R >>`) - 1;

  let pdf = '%PDF-1.3\n';
  const offsets = [0];
  let body = '';
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf + body));
    body += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  pdf += body;
  const xrefOffset = Buffer.byteLength(pdf);
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(off => {
    xref += off.toString().padStart(10, '0') + ' 00000 n \n';
  });
  const trailer = `trailer\n<< /Size ${objs.length + 1} /Root ${catalogIndex + 1} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  pdf += xref + trailer;
  return Buffer.from(pdf);
}

// Almacenamos las imágenes en la carpeta pública de uploads
const uploadDir = path.join(__dirname, '../../frontend/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function storeImage(data) {
  if (!data || typeof data !== 'string' || !data.startsWith('data:image')) return data || '';
  const match = data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return '';
  const ext = match[1].split('/')[1];
  const name = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  fs.writeFileSync(path.join(uploadDir, name), match[2], 'base64');
  return `uploads/${name}`;
}
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
  const q = `SELECT o.cobranzaId AS ordenId, o.usuarioId, o.metodoPago, o.creadoEn,
                    u.nombre, u.apellido,
                    COUNT(o.id) as items,
                    SUM(o.precioProducto * o.cantidad) as total
             FROM cobranzas o
             LEFT JOIN clientes u ON o.usuarioId = u.id
             GROUP BY o.cobranzaId
             ORDER BY o.cobranzaId DESC`;
  db.all(q, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/products', (req, res) => {
  const { nombre, descripcion, precio, stock, url } = req.body;
  const image = storeImage(url);
  db.run(
    'INSERT INTO productos (nombre, descripcion, precio, stock, url) VALUES (?, ?, ?, ?, ?)',
    [nombre, descripcion, precio, stock || 0, image],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/products/:id', (req, res) => {
  const { nombre, descripcion, precio, stock, url } = req.body;
  const fields = ['nombre = ?', 'descripcion = ?', 'precio = ?', 'stock = ?'];
  const params = [nombre, descripcion, precio, stock];
  if (url !== undefined) {
    fields.push('url = ?');
    params.push(storeImage(url));
  }
  params.push(req.params.id);
  const q = 'UPDATE productos SET ' + fields.join(', ') + ' WHERE id = ?';
  db.run(q, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
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
  const q = `SELECT f.id, f.cobranzaId AS ordenId, f.usuarioId, f.creadoEn,
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
  const q = `SELECT f.id, f.cobranzaId AS ordenId, f.usuarioId, f.creadoEn,
                    u.nombre, u.apellido
             FROM facturas f
             LEFT JOIN clientes u ON f.usuarioId = u.id
             WHERE f.id = ?`;
  db.get(q, [id], (err, invoice) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    db.all(
      'SELECT nombreProducto, cantidad, precioProducto FROM cobranzas WHERE cobranzaId = ?',
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

// ---- Export reports in PDF ----
router.get('/export/:module', (req, res) => {
  const mod = req.params.module;
  const search = req.query.search || '';
  const like = `%${search}%`;
  const sendPdf = (lines, fname) => {
    const pdf = createPdf(lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}.pdf"`);
    res.end(pdf);
  };

  switch (mod) {
    case 'products': {
      const params = [];
      let q = 'SELECT id, nombre, precio, stock FROM productos';
      if (search) {
        q += ' WHERE nombre LIKE ?';
        params.push(like);
      }
      q += ' ORDER BY id';
      db.all(q, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const lines = ['Listado de Productos', 'ID | Nombre | Precio | Stock'];
        rows.forEach(p => {
          lines.push(`${p.id} - ${p.nombre} - $${p.precio} - Stock: ${p.stock || 0}`);
        });
        sendPdf(lines, 'productos');
      });
      break;
    }
    case 'users': {
      const params = [];
      let q = 'SELECT id, nombre, apellido, correo, isAdmin FROM clientes';
      if (search) {
        q += ' WHERE nombre LIKE ? OR apellido LIKE ? OR correo LIKE ?';
        params.push(like, like, like);
      }
      q += ' ORDER BY id';
      db.all(q, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const lines = ['Listado de Clientes', 'ID | Nombre | Correo | Admin'];
        rows.forEach(u => {
          lines.push(`${u.id} - ${u.nombre} ${u.apellido} - ${u.correo} - ${u.isAdmin ? 'si' : 'no'}`);
        });
        sendPdf(lines, 'clientes');
      });
      break;
    }
    case 'cobranzas': {
      const params = [];
      let q = `SELECT o.cobranzaId AS ordenId, u.nombre, u.apellido, o.metodoPago, o.creadoEn,
                       COUNT(o.id) as items, SUM(o.precioProducto * o.cantidad) as total
                FROM cobranzas o LEFT JOIN clientes u ON o.usuarioId = u.id`;
      if (search) {
        q += ' WHERE CAST(o.cobranzaId AS TEXT) LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ?';
        params.push(like, like, like);
      }
      q += ' GROUP BY o.cobranzaId ORDER BY o.cobranzaId DESC';
      db.all(q, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const lines = ['Listado de Cobranzas', 'Orden | Cliente | Pago | Total'];
        rows.forEach(r => {
          lines.push(`${r.ordenId} - ${r.nombre || ''} ${r.apellido || ''} - ${r.metodoPago} - $${r.total}`);
        });
        sendPdf(lines, 'cobranzas');
      });
      break;
    }
    case 'facturas': {
      const params = [];
      let q = `SELECT f.id, f.cobranzaId AS ordenId, f.creadoEn, u.nombre, u.apellido
               FROM facturas f LEFT JOIN clientes u ON f.usuarioId = u.id`;
      if (search) {
        q += ' WHERE CAST(f.id AS TEXT) LIKE ? OR CAST(f.cobranzaId AS TEXT) LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ?';
        params.push(like, like, like, like);
      }
      q += ' ORDER BY f.id DESC';
      db.all(q, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const lines = ['Listado de Facturas', 'ID | Orden | Cliente | Fecha'];
        rows.forEach(f => {
          lines.push(`${f.id} - ${f.ordenId} - ${f.nombre || ''} ${f.apellido || ''} - ${f.creadoEn}`);
        });
        sendPdf(lines, 'facturas');
      });
      break;
    }
    case 'suppliers': {
      const params = [];
      let q = 'SELECT id, nombre, correo, telefono FROM proveedores';
      if (search) {
        q += ' WHERE nombre LIKE ? OR correo LIKE ? OR telefono LIKE ?';
        params.push(like, like, like);
      }
      q += ' ORDER BY id';
      db.all(q, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const lines = ['Listado de Proveedores', 'ID | Nombre | Correo | Tel'];
        rows.forEach(s => {
          lines.push(`${s.id} - ${s.nombre} - ${s.correo || ''} - ${s.telefono || ''}`);
        });
        sendPdf(lines, 'proveedores');
      });
      break;
    }
    case 'purchase-orders': {
      const params = [];
      let q = `SELECT oc.ordenId, oc.creadoEn, p.nombre AS proveedorNombre,
                      SUM(oc.cantidad * oc.precioProducto) AS total,
                      COUNT(oc.id) AS items
               FROM ordenes_compra oc
               LEFT JOIN proveedores p ON oc.proveedorId = p.id`;
      if (search) {
        q += ' WHERE CAST(oc.ordenId AS TEXT) LIKE ? OR p.nombre LIKE ?';
        params.push(like, like);
      }
      q += ' GROUP BY oc.ordenId ORDER BY oc.ordenId DESC';
      db.all(q, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const lines = ['Listado de Órdenes de Compra', 'Orden | Proveedor | Total'];
        rows.forEach(o => {
          lines.push(`${o.ordenId} - ${o.proveedorNombre || ''} - $${o.total}`);
        });
        sendPdf(lines, 'ordenes_compra');
      });
      break;
    }
    default:
      res.status(400).json({ error: 'Módulo no válido' });
  }
});

module.exports = router;
