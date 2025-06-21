
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './db.sqlite';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    password TEXT
  )`);

  // Ensure new columns exist for older databases
  db.all('PRAGMA table_info(users)', (err, columns) => {
    if (err) return;
    const names = columns.map(c => c.name);
    if (!names.includes('first_name')) {
      db.run('ALTER TABLE users ADD COLUMN first_name TEXT');
    }
    if (!names.includes('last_name')) {
      db.run('ALTER TABLE users ADD COLUMN last_name TEXT');
    }
    if (!names.includes('email')) {
      db.run('ALTER TABLE users ADD COLUMN email TEXT');
      db.run(
        'CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)'
      );
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    price REAL
  )`);

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
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id),
    FOREIGN KEY(productId) REFERENCES products(id)
  )`);

  // Ensure the orderId column exists for databases created with older versions
  db.all('PRAGMA table_info(orders)', (err, columns) => {
    if (err) return;
    const hasOrderId = columns.some(c => c.name === 'orderId');
    if (!hasOrderId) {
      db.run('ALTER TABLE orders ADD COLUMN orderId INTEGER');
    }
  });
});

module.exports = db;
