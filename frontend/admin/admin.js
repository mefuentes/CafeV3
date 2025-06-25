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

function checkAdmin() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !user.isAdmin) {
    window.location.href = 'login.html';
    return;
  }
  loadAdminProducts();
}

function logout() {
  localStorage.removeItem('user');
  window.location.href = 'login.html';
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
