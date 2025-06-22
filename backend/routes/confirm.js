
const express = require('express');
const db = require('../models/db');
const router = express.Router();

// Generador simple de PDF sin dependencias externas
function createPdf(lines) {
  const objs = [];
  const fontIndex =
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>') - 1;
  const contentLines = lines
    .map((l, i) => `0 ${750 - i * 20} Td (${l.replace(/[()]/g, '')}) Tj`)
    .join('\n');
  const streamContent = `BT\n/F1 12 Tf\n${contentLines}\nET`;
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
  offsets.slice(1).forEach((off) => {
    xref += off.toString().padStart(10, '0') + ' 00000 n \n';
  });
  const trailer = `trailer\n<< /Size ${objs.length + 1} /Root ${catalogIndex + 1} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  pdf += xref + trailer;
  return Buffer.from(pdf);
}

router.post('/confirm', (req, res) => {
  const { userId, method } = req.body;

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

    db.get('SELECT COALESCE(MAX(orderId), 0) as maxId FROM orders', (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const orderId = (row ? row.maxId : 0) + 1;

      const stmt = db.prepare(
        'INSERT INTO orders (orderId, userId, productId, productName, productPrice, quantity, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      items.forEach(i => {
        stmt.run(orderId, userId, i.productId, i.name, i.price, i.quantity, method);
      });
      stmt.finalize(err => {
        if (err) return res.status(500).json({ error: err.message });

        db.run('DELETE FROM cart WHERE userId = ?', [userId], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: "Compra confirmada y registrada.", orderId });
        });
      });
    });
  });
});

router.get('/invoice/:orderId', (req, res) => {
  const { orderId } = req.params;
  db.all('SELECT * FROM orders WHERE orderId = ?', [orderId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Orden no encontrada' });

    const userId = rows[0].userId;
    db.get('SELECT nombre, apellido FROM users WHERE id = ?', [userId], (err2, user) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const now = new Date();
      const date = now.toLocaleDateString('es-ES');
      const time = now.toLocaleTimeString('es-ES');
      let total = 0;
      const lines = [
        'Caf\u00E9 El Mejor',
        `Cliente: ${user.nombre} ${user.apellido}`,
        `Fecha: ${date}`,
        `Hora: ${time}`,
        'Productos:'
      ];
      rows.forEach(r => {
        total += r.productPrice * r.quantity;
        lines.push(`${r.productName} x${r.quantity} - $${r.productPrice}`);
      });
      lines.push(`Total a pagar: $${total}`);
      const pdf = createPdf(lines);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="factura_${orderId}.pdf"`);
      res.end(pdf);
    });
  });
});

module.exports = router;
