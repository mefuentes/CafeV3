
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './db.sqlite';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    apellido TEXT,
    correo TEXT UNIQUE,
    contrasena TEXT,
    isAdmin INTEGER DEFAULT 0
  )`);

  // Ensure new columns exist for older databases
  db.all('PRAGMA table_info(usuarios)', (err, columns) => {
    if (err) return;
    const names = columns.map(c => c.name);
    if (!names.includes('nombre')) {
      db.run('ALTER TABLE usuarios ADD COLUMN nombre TEXT');
    }
    if (!names.includes('apellido')) {
      db.run('ALTER TABLE usuarios ADD COLUMN apellido TEXT');
    }
    if (!names.includes('correo')) {
      db.run('ALTER TABLE usuarios ADD COLUMN correo TEXT');
      db.run(
        'CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo_unique ON usuarios(correo)'
      );
    }
    if (!names.includes('contrasena')) {
      db.run('ALTER TABLE usuarios ADD COLUMN contrasena TEXT');
    }
    if (!names.includes('isAdmin')) {
      db.run('ALTER TABLE usuarios ADD COLUMN isAdmin INTEGER DEFAULT 0');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    descripcion TEXT,
    precio REAL
  )`);

  // Insertar productos predeterminados si no existen
  const defaultProducts = [
    { nombre: 'Café Molido', descripcion: '250g café molido premium', precio: 3500 },
    { nombre: 'Café en Grano', descripcion: 'Café en grano de altura', precio: 4000 },
    { nombre: 'Café Orgánico', descripcion: 'Café sin pesticidas certificado', precio: 4500 },
    { nombre: 'Taza de Cerámica', descripcion: 'Taza térmica de alta calidad', precio: 2500 },
    { nombre: 'Filtro de Papel', descripcion: 'Paquete de 100 filtros para café', precio: 500 }
  ];

  db.all('SELECT nombre FROM productos', (err, rows) => {
    if (err) return;
    const names = rows.map(r => r.nombre);
    defaultProducts.forEach(p => {
      if (!names.includes(p.nombre)) {
        db.run(
          'INSERT INTO productos (nombre, descripcion, precio) VALUES (?, ?, ?)',
          [p.nombre, p.descripcion, p.precio]
        );
      }
    });
  });

  db.run(`CREATE TABLE IF NOT EXISTS carrito (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuarioId INTEGER,
    productoId INTEGER,
    cantidad INTEGER,
    FOREIGN KEY(usuarioId) REFERENCES usuarios(id),
    FOREIGN KEY(productoId) REFERENCES productos(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ordenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ordenId INTEGER,
    usuarioId INTEGER,
    productoId INTEGER,
    nombreProducto TEXT,
    precioProducto REAL,
    cantidad INTEGER,
    metodoPago TEXT,
    creadoEn DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(usuarioId) REFERENCES usuarios(id),
    FOREIGN KEY(productoId) REFERENCES productos(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ordenId INTEGER,
    usuarioId INTEGER,
    creadoEn DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ordenId) REFERENCES ordenes(ordenId),
    FOREIGN KEY(usuarioId) REFERENCES usuarios(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    correo TEXT,
    telefono TEXT
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
  db.all('PRAGMA table_info(ordenes)', (err, columns) => {
    if (err) return;
    const names = columns.map(c => c.name);
    if (!names.includes('ordenId')) {
      db.run('ALTER TABLE ordenes ADD COLUMN ordenId INTEGER');
    }
    if (!names.includes('metodoPago')) {
      db.run('ALTER TABLE ordenes ADD COLUMN metodoPago TEXT');
    }
  });
});

module.exports = db;
