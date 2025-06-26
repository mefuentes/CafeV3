
const express = require('express');
const db = require('../models/db');
const router = express.Router();

// Generador simple de PDF sin dependencias externas
function createPdf(lines) {
  const objs = [];
  const fontIndex =
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>') - 1;
  // Posicionamos cada línea de forma absoluta usando Tm para evitar
  // acumulación de desplazamientos con Td, que provocaba que el texto
  // quedara fuera de la página.
  const contentLines = lines
    .map(
      (l, i) =>
        `1 0 0 1 50 ${750 - i * 20} Tm (${l.replace(/[()]/g, '')}) Tj`
    )
    .join('\n');
  // Utilizamos una fuente ligeramente más grande para mejorar la legibilidad
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
  offsets.slice(1).forEach((off) => {
    xref += off.toString().padStart(10, '0') + ' 00000 n \n';
  });
  const trailer = `trailer\n<< /Size ${objs.length + 1} /Root ${catalogIndex + 1} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  pdf += xref + trailer;
  return Buffer.from(pdf);
}

router.post('/confirm', (req, res) => {
  const { usuarioId, method } = req.body;

  const q = `
    SELECT c.productoId, c.cantidad, p.nombre, p.precio, p.stock
    FROM carrito c
    JOIN productos p ON c.productoId = p.id
    WHERE c.usuarioId = ?
  `;

  db.all(q, [usuarioId], (err, items) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!items.length) {
      return res.json({ message: "No hay productos en el carrito." });
    }

    const sinStock = items.find(it => !it.stock || it.stock < it.cantidad);
    if (sinStock) {
      return res
        .status(400)
        .json({ error: `No hay stock suficiente de ${sinStock.nombre}` });
    }

    db.get('SELECT COALESCE(MAX(ordenId), 0) as maxId FROM ordenes', (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const orderId = (row ? row.maxId : 0) + 1;

      const stmt = db.prepare(
        'INSERT INTO ordenes (ordenId, usuarioId, productoId, nombreProducto, precioProducto, cantidad, metodoPago) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      items.forEach(i => {
        stmt.run(orderId, usuarioId, i.productoId, i.nombre, i.precio, i.cantidad, method);
        db.run('UPDATE productos SET stock = stock - ? WHERE id = ?', [i.cantidad, i.productoId]);
      });
      stmt.finalize(err => {
        if (err) return res.status(500).json({ error: err.message });

        db.run('INSERT INTO facturas (ordenId, usuarioId) VALUES (?, ?)', [orderId, usuarioId], function(err3) {
          if (err3) return res.status(500).json({ error: err3.message });
          const invoiceId = this.lastID;
          db.run('DELETE FROM carrito WHERE usuarioId = ?', [usuarioId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Compra confirmada y registrada.", orderId, invoiceId });
          });
        });
      });
    });
  });
});

router.get('/invoice/:orderId', (req, res) => {
  const { orderId } = req.params;
  db.all('SELECT * FROM ordenes WHERE ordenId = ?', [orderId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Orden no encontrada' });

    const userId = rows[0].usuarioId;
    db.get('SELECT nombre, apellido FROM usuarios WHERE id = ?', [userId], (err2, user) => {
      if (err2) return res.status(500).json({ error: err2.message });
      db.get('SELECT id FROM facturas WHERE ordenId = ?', [orderId], (err3, invoice) => {
        if (err3) return res.status(500).json({ error: err3.message });
        if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

        const now = new Date();
        const date = now.toLocaleDateString('es-ES');
        const time = now.toLocaleTimeString('es-ES');
        let total = 0;
        const lines = [
          'Caf\u00E9 El Mejor',
          '-----------------------------',
          'FACTURA DE COMPRA',
          `N\u00BA ${invoice.id}`,
          `Cliente: ${user.nombre} ${user.apellido}`,
          `Fecha y hora: ${date} ${time}`,
          '-----------------------------',
          'Producto | Cant. | Precio | Subtotal'
        ];
        rows.forEach(r => {
          const subtotal = r.precioProducto * r.cantidad;
          total += subtotal;
          lines.push(`${r.nombreProducto} x${r.cantidad} - $${r.precioProducto} = $${subtotal}`);
        });
        lines.push('-----------------------------');
        lines.push(`Total a pagar: $${total}`);
        lines.push('Gracias por su compra');
        const pdf = createPdf(lines);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="factura_${invoice.id}.pdf"`);
        res.end(pdf);
      });
    });
  });
});

module.exports = router;
