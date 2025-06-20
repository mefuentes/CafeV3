
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const confirmRoutes = require('./routes/confirm');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', cartRoutes);

const PORT = 3000;
app.listen(PORT, () => {
app.use('/api', confirmRoutes);
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
