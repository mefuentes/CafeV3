
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './db.sqlite';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    apellido TEXT,
    correo TEXT UNIQUE,
    contrasena TEXT,
    isAdmin INTEGER DEFAULT 0
  )`);

  // Ensure new columns exist for older databases
  db.all('PRAGMA table_info(clientes)', (err, columns) => {
    if (err) return;
    const names = columns.map(c => c.name);
    if (!names.includes('nombre')) {
      db.run('ALTER TABLE clientes ADD COLUMN nombre TEXT');
    }
    if (!names.includes('apellido')) {
      db.run('ALTER TABLE clientes ADD COLUMN apellido TEXT');
    }
    if (!names.includes('correo')) {
      db.run('ALTER TABLE clientes ADD COLUMN correo TEXT');
      db.run(
        'CREATE UNIQUE INDEX IF NOT EXISTS clientes_correo_unique ON clientes(correo)'
      );
    }
    if (!names.includes('contrasena')) {
      db.run('ALTER TABLE clientes ADD COLUMN contrasena TEXT');
    }
    if (!names.includes('isAdmin')) {
      db.run('ALTER TABLE clientes ADD COLUMN isAdmin INTEGER DEFAULT 0');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    descripcion TEXT,
    precio REAL,
    stock INTEGER DEFAULT 0,
    url TEXT
  )`);

  db.all('PRAGMA table_info(productos)', (err, columns) => {
    if (err) return;
    const names = columns.map(c => c.name);
    if (!names.includes('stock')) {
      db.run('ALTER TABLE productos ADD COLUMN stock INTEGER DEFAULT 0');
    }
    if (!names.includes('url')) {
      db.run('ALTER TABLE productos ADD COLUMN url TEXT');
    }
  });

  // Insertar productos predeterminados si no existen
  const defaultProducts = [
    { nombre: 'Café Molido', descripcion: '250g café molido premium', precio: 3500, url: '' },
    { nombre: 'Café en Grano', descripcion: 'Café en grano de altura', precio: 4000, url: '' },
    { nombre: 'Café Orgánico', descripcion: 'Café sin pesticidas certificado', precio: 4500, url: '' },
    { nombre: 'Taza de Cerámica', descripcion: 'Taza térmica de alta calidad', precio: 2500, url: '' },
    { nombre: 'Filtro de Papel', descripcion: 'Paquete de 100 filtros para café', precio: 500, url: '' }
  ];

  db.all('SELECT nombre FROM productos', (err, rows) => {
    if (err) return;
    const names = rows.map(r => r.nombre);
    defaultProducts.forEach(p => {
      if (!names.includes(p.nombre)) {
        db.run(
          'INSERT INTO productos (nombre, descripcion, precio, url) VALUES (?, ?, ?, ?)',
          [p.nombre, p.descripcion, p.precio, p.url]
        );
      }
    });
  });

  db.run(`CREATE TABLE IF NOT EXISTS carrito (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuarioId INTEGER,
    productoId INTEGER,
    cantidad INTEGER,
    FOREIGN KEY(usuarioId) REFERENCES clientes(id),
    FOREIGN KEY(productoId) REFERENCES productos(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cobranzas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ordenId INTEGER,
    usuarioId INTEGER,
    productoId INTEGER,
    nombreProducto TEXT,
    precioProducto REAL,
    cantidad INTEGER,
    metodoPago TEXT,
    creadoEn DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(usuarioId) REFERENCES clientes(id),
    FOREIGN KEY(productoId) REFERENCES productos(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ordenId INTEGER,
    usuarioId INTEGER,
    creadoEn DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ordenId) REFERENCES cobranzas(ordenId),
    FOREIGN KEY(usuarioId) REFERENCES clientes(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    correo TEXT,
    telefono TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ordenes_compra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ordenId INTEGER,
    proveedorId INTEGER,
    productoId INTEGER,
    nombreProducto TEXT,
    precioProducto REAL,
    cantidad INTEGER,
    creadoEn DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(proveedorId) REFERENCES proveedores(id),
    FOREIGN KEY(productoId) REFERENCES productos(id)
  )`);

  db.all('PRAGMA table_info(proveedores)', (err, columns) => {
    if (err) return;
    const names = columns.map(c => c.name);
    if (!names.includes('correo')) {
      db.run('ALTER TABLE proveedores ADD COLUMN correo TEXT');
      db.run('UPDATE proveedores SET correo = contacto WHERE correo IS NULL');
    }
  });

  // Ensure new columns exist for databases created with older versions
  db.all('PRAGMA table_info(cobranzas)', (err, columns) => {
    if (err) return;
    const names = columns.map(c => c.name);
    if (!names.includes('ordenId')) {
      db.run('ALTER TABLE cobranzas ADD COLUMN ordenId INTEGER');
    }
    if (!names.includes('metodoPago')) {
      db.run('ALTER TABLE cobranzas ADD COLUMN metodoPago TEXT');
    }
  });
});

module.exports = db;
