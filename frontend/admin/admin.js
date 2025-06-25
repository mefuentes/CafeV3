function adminLogin() {
  const correo = document.getElementById('logEmail').value;
  const contrasena = document.getElementById('logPass').value;
  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, contrasena })
  })
    .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
    .then(({ ok, data }) => {
      if (!ok) return alert(data.error || 'Error');
      if (!data.isAdmin) return alert('No eres administrador');
      localStorage.setItem('user', JSON.stringify(data));
      window.location.href = 'dashboard.html';
    });
}

let editId = null;
let adminProducts = [];
let userEditId = null;
let adminUsers = [];

function initAdmin() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !user.isAdmin) {
    window.location.href = 'login.html';
    return;
  }
  showModule('products');
}

function logout() {
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

function showModule(name) {
  document.getElementById('productsModule').style.display =
    name === 'products' ? 'block' : 'none';
  document.getElementById('usersModule').style.display =
    name === 'users' ? 'block' : 'none';
  if (name === 'products') {
    loadAdminProducts();
  } else if (name === 'users') {
    loadAdminUsers();
  }
}

function loadAdminProducts() {
  const query = document.getElementById('search').value || '';
  fetch('/api/products?search=' + encodeURIComponent(query))
    .then(r => r.json())
    .then(data => {
      adminProducts = data;
      const container = document.getElementById('products');
      container.innerHTML = '';
      data.forEach(p => {
        container.innerHTML += `<div>${p.nombre} - $${p.precio} <button onclick="editProduct(${p.id})">Editar</button> <button onclick="deleteProduct(${p.id})">Eliminar</button></div>`;
      });
    });
}

function deleteProduct(id) {
  const user = JSON.parse(localStorage.getItem('user'));
  fetch('/admin/api/products/' + id, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-user-id': user.id }
  }).then(() => loadAdminProducts());
}

function editProduct(id) {
  const p = adminProducts.find(pr => pr.id === id);
  if (!p) return;
  document.getElementById('newName').value = p.nombre;
  document.getElementById('newDesc').value = p.descripcion;
  document.getElementById('newPrice').value = p.precio;
  document.getElementById('saveBtn').textContent = 'Guardar';
  editId = id;
}

function createProduct() {
  const user = JSON.parse(localStorage.getItem('user'));
  const nombre = document.getElementById('newName').value;
  const descripcion = document.getElementById('newDesc').value;
  const precio = parseFloat(document.getElementById('newPrice').value);
  const url = editId ? '/admin/api/products/' + editId : '/admin/api/products';
  const method = editId ? 'PUT' : 'POST';
  fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': user.id
    },
    body: JSON.stringify({ nombre, descripcion, precio })
  }).then(() => {
    document.getElementById('newName').value = '';
    document.getElementById('newDesc').value = '';
    document.getElementById('newPrice').value = '';
    document.getElementById('saveBtn').textContent = 'Agregar';
    editId = null;
    loadAdminProducts();
  });
}

// ---- User management ----

function loadAdminUsers() {
  const user = JSON.parse(localStorage.getItem('user'));
  const query = document.getElementById('searchUsers').value || '';
  fetch('/admin/api/users?search=' + encodeURIComponent(query), {
    headers: { 'x-user-id': user.id }
  })
    .then(r => r.json())
    .then(data => {
      adminUsers = data;
      const container = document.getElementById('users');
      container.innerHTML = '';
      data.forEach(u => {
        const admin = u.isAdmin ? ' (admin)' : '';
        container.innerHTML += `<div>${u.nombre} ${u.apellido} - ${u.correo}${admin} <button onclick="editUser(${u.id})">Editar</button> <button onclick="deleteUser(${u.id})">Eliminar</button></div>`;
      });
    });
}

function deleteUser(id) {
  const user = JSON.parse(localStorage.getItem('user'));
  fetch('/admin/api/users/' + id, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-user-id': user.id }
  }).then(() => loadAdminUsers());
}

function editUser(id) {
  const u = adminUsers.find(us => us.id === id);
  if (!u) return;
  document.getElementById('userName').value = u.nombre;
  document.getElementById('userLast').value = u.apellido;
  document.getElementById('userEmail').value = u.correo;
  document.getElementById('userAdmin').checked = !!u.isAdmin;
  document.getElementById('userPass').value = '';
  document.getElementById('saveUserBtn').textContent = 'Guardar';
  userEditId = id;
}

function createUser() {
  const user = JSON.parse(localStorage.getItem('user'));
  const nombre = document.getElementById('userName').value;
  const apellido = document.getElementById('userLast').value;
  const correo = document.getElementById('userEmail').value;
  const contrasena = document.getElementById('userPass').value;
  const isAdmin = document.getElementById('userAdmin').checked;
  const url = userEditId ? '/admin/api/users/' + userEditId : '/admin/api/users';
  const method = userEditId ? 'PUT' : 'POST';
  const body = { nombre, apellido, correo, isAdmin };
  if (!userEditId) body.contrasena = contrasena;
  if (userEditId && contrasena) body.contrasena = contrasena;
  fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': user.id
    },
    body: JSON.stringify(body)
  }).then(() => {
    document.getElementById('userName').value = '';
    document.getElementById('userLast').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userPass').value = '';
    document.getElementById('userAdmin').checked = false;
    document.getElementById('saveUserBtn').textContent = 'Agregar';
    userEditId = null;
    loadAdminUsers();
  });
}
