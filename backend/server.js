
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const confirmRoutes = require('./routes/confirm');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');
const cobranzaRoutes = require('./routes/cobranzas');

const app = express();
app.use(cors());
// Allow larger JSON payloads to support base64-encoded images
app.use(express.json({ limit: '10mb' }));
// Sirve la página de inicio antes de la carpeta estática para evitar que index.html
// intercepte la ruta raíz
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/landing.html'))
);
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));

app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/admin/dashboard.html'))
);
app.get('/admin/login', (req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/admin/login.html'))
);

app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', cartRoutes);
app.use('/api', confirmRoutes);
app.use('/api', cobranzaRoutes);
app.use('/admin/api', adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
