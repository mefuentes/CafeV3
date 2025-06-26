Café El Mejor - Proyecto Web

INSTRUCCIONES:
1. Abrí la carpeta 'backend' en VS Code.
2. Ejecutá:
   npm install
   PORT=3000 DB_PATH=./db.sqlite node server.js
3. Abrí http://localhost:3000/ en el navegador.
4. Usá login o registro. Solo los clientes logueados pueden agregar al carrito.

ADMINISTRACIÓN:
1. Creá un cliente normal y luego marcá su cuenta como administrador ejecutando:
   sqlite3 backend/db.sqlite "UPDATE clientes SET isAdmin=1 WHERE correo='tu@correo.com';"
2. Ingresá a http://localhost:3000/admin/login para acceder al panel.
3. Desde el dashboard podrás crear o borrar productos.

La base de datos se encuentra en: backend/db.sqlite
Puedes cambiar la ubicación de la base de datos y el puerto con las variables
de entorno DB_PATH y PORT respectivamente.
