Café El Mejor - Aplicación Web
==============================

Este proyecto es una plataforma sencilla para la venta de café y productos relacionados. Consta de un backend en Node.js que expone una API REST y un frontend hecho con HTML, CSS y JavaScript.

---

## Tecnologías utilizadas

- **Node.js** y **Express** como servidor web.
- **SQLite3** como base de datos embebida.
- **HTML5**, **CSS3** y **JavaScript** para la interfaz de usuario.
- Generación de facturas en **PDF** a partir de un script propio (sin librerías externas).
- **CORS** habilitado para permitir peticiones desde el frontend.

## Estructura del repositorio

```
backend/   Código del servidor Express y la base de datos
frontend/  Archivos estáticos que se sirven al navegador
README.txt Este documento
```

Dentro de **backend** se encuentran:

- `server.js` – inicia el servidor, sirve la carpeta `frontend` y define las rutas principales.
- `models/db.js` – configuración y creación de tablas en SQLite.
- `routes/` – archivos con las rutas REST (`auth`, `products`, `cart`, `confirm`, `admin`, `cobranzas`).
- `package.json` – dependencias (`express`, `sqlite3`, `cors`) y scripts de npm.
- `tests/` – carpeta reservada para pruebas (actualmente sin implementaciones).

El directorio **frontend** contiene las páginas del sitio y su lógica en JavaScript:

- `landing.html` / `landing.js` – página pública inicial.
- `login.html` y `registro.html` – formulario de acceso y registro de clientes.
- `index.html` y `app.js` – catálogo de productos, carrito y confirmación de compra.
- `pago.html` – selección de método de pago.
- `admin/` – panel de administración (dashboard, script `admin.js`).
- `styles.css` – estilos compartidos.

Las imágenes subidas por el administrador se almacenan en `frontend/uploads/`.

## Instalación

1. Abre una terminal en la carpeta `backend`.
2. Ejecuta:
   ```bash
   npm install
   PORT=3000 DB_PATH=./db.sqlite node server.js
   ```
3. Visita `http://localhost:3000/` en el navegador.
4. Regístrate o inicia sesión para poder agregar productos al carrito.

## Funcionamiento general

- Los clientes pueden registrarse, iniciar sesión, navegar los productos y realizar compras.
- El carrito se almacena en la base de datos y se verifica el stock antes de confirmar.
- Al confirmar la compra se genera un registro en `cobranzas` y una factura en `facturas`. El endpoint `/api/invoice/:orderId` permite descargar el PDF generado.

### Panel de administración

1. Crea primero un usuario normal y luego márcalo como administrador:
   ```bash
   sqlite3 backend/db.sqlite "UPDATE clientes SET isAdmin=1 WHERE correo='tu@correo.com';"
   ```
2. Accede a `http://localhost:3000/admin/login`.
3. Desde el dashboard podrás administrar productos, usuarios, cobranzas, facturas, proveedores y órdenes de compra.

## Variables de entorno

- `PORT` – Puerto donde se levanta el servidor (por defecto 3000).
- `DB_PATH` – Ruta al archivo SQLite (por defecto `./db.sqlite`).

## Pruebas

Existe un script `npm test` pero actualmente no hay pruebas implementadas (`backend/tests/run-tests.js`).

---

Este proyecto demuestra cómo montar una aplicación web completa utilizando únicamente herramientas básicas de Node.js y un frontend ligero en HTML/CSS/JS.
