
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './db.sqlite';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    apellido TEXT,
    correo TEXT UNIQUE,
    contrasena TEXT
  )`);

  // Ensure new columns exist for older databases
  db.all('PRAGMA table_info(users)', (err, columns) => {
    if (err) return;
    const names = columns.map(c => c.name);
    if (!names.includes('nombre')) {
      db.run('ALTER TABLE users ADD COLUMN nombre TEXT');
    }
    if (!names.includes('apellido')) {
      db.run('ALTER TABLE users ADD COLUMN apellido TEXT');
    }
    if (!names.includes('correo')) {
      db.run('ALTER TABLE users ADD COLUMN correo TEXT');
      db.run(
        'CREATE UNIQUE INDEX IF NOT EXISTS users_correo_unique ON users(correo)'
      );
    }
    if (!names.includes('contrasena')) {
      db.run('ALTER TABLE users ADD COLUMN contrasena TEXT');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    price REAL
  )`);

  // Insert default products if they don't exist
  const defaultProducts = [
    { name: 'Café Molido', description: '250g café molido premium', price: 3500 },
    { name: 'Café en Grano', description: 'Café en grano de altura', price: 4000 },
    { name: 'Café Orgánico', description: 'Café sin pesticidas certificado', price: 4500 },
    { name: 'Taza de Cerámica', description: 'Taza térmica de alta calidad', price: 2500 },
    { name: 'Filtro de Papel', description: 'Paquete de 100 filtros para café', price: 500 }
  ];

  db.all('SELECT name FROM products', (err, rows) => {
    if (err) return;
    const names = rows.map(r => r.name);
    defaultProducts.forEach(p => {
      if (!names.includes(p.name)) {
        db.run(
          'INSERT INTO products (name, description, price) VALUES (?, ?, ?)',
          [p.name, p.description, p.price]
        );
      }
    });
  });

  db.run(`CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    productId INTEGER,
    quantity INTEGER,
    FOREIGN KEY(userId) REFERENCES users(id),
    FOREIGN KEY(productId) REFERENCES products(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER,
    userId INTEGER,
    productId INTEGER,
    productName TEXT,
    productPrice REAL,
    quantity INTEGER,
    paymentMethod TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id),
    FOREIGN KEY(productId) REFERENCES products(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER,
    userId INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(orderId) REFERENCES orders(orderId),
    FOREIGN KEY(userId) REFERENCES users(id)
  )`);

  // Ensure new columns exist for databases created with older versions
  db.all('PRAGMA table_info(orders)', (err, columns) => {
    if (err) return;
    const names = columns.map(c => c.name);
    if (!names.includes('orderId')) {
      db.run('ALTER TABLE orders ADD COLUMN orderId INTEGER');
    }
    if (!names.includes('paymentMethod')) {
      db.run('ALTER TABLE orders ADD COLUMN paymentMethod TEXT');
    }
  });
});

module.exports = db;
