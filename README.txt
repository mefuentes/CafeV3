Café El Mejor - Proyecto Web

INSTRUCCIONES:
1. Abrí la carpeta 'backend' en VS Code.
2. Ejecutá:
   npm install
   PORT=3000 DB_PATH=./db.sqlite node server.js
3. Abrí http://localhost:3000/ en el navegador.
4. Usá login o registro. Solo los usuarios logueados pueden agregar al carrito.

La base de datos se encuentra en: backend/db.sqlite
Puedes cambiar la ubicación de la base de datos y el puerto con las variables
de entorno DB_PATH y PORT respectivamente.
