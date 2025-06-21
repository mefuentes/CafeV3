
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const confirmRoutes = require('./routes/confirm');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');

const app = express();
app.use(cors());
app.use(express.json());
// Sirve la página de inicio antes de la carpeta estática para evitar que index.html
// intercepte la ruta raíz
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/landing.html'))
);
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', cartRoutes);
app.use('/api', confirmRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
