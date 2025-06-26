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
let currentStock = 0;
let adminPurchases = [];
let userEditId = null;
let adminUsers = [];
let adminOrders = [];
let adminInvoices = [];
let adminSuppliers = [];
let supplierEditId = null;
const paymentMethods = ['Tarjeta de Débito', 'Tarjeta de Crédito', 'Código QR'];

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
  document.getElementById('cobranzasModule').style.display =
    name === 'cobranzas' ? 'block' : 'none';
  document.getElementById('invoicesModule').style.display =
    name === 'invoices' ? 'block' : 'none';
  document.getElementById('suppliersModule').style.display =
    name === 'suppliers' ? 'block' : 'none';
  document.getElementById('purchasesModule').style.display =
    name === 'purchases' ? 'block' : 'none';
  if (name === 'products') {
    loadAdminProducts();
  } else if (name === 'users') {
    loadAdminUsers();
  } else if (name === 'cobranzas') {
    loadAdminOrders();
  } else if (name === 'invoices') {
    loadAdminInvoices();
  } else if (name === 'suppliers') {
    loadAdminSuppliers();
  } else if (name === 'purchases') {
    loadAdminPurchases();
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
        container.innerHTML += `<div>${p.nombre} - $${p.precio} - Stock: ${p.stock || 0} <button onclick="editProduct(${p.id})">Editar</button> <button onclick="deleteProduct(${p.id})">Eliminar</button></div>`;
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
  currentStock = p.stock || 0;
  document.getElementById('saveBtn').textContent = 'Guardar';
  editId = id;
}

function createProduct() {
  const user = JSON.parse(localStorage.getItem('user'));
  const nombre = document.getElementById('newName').value;
  const descripcion = document.getElementById('newDesc').value;
  const precio = parseFloat(document.getElementById('newPrice').value);
  const stock = currentStock;
  const url = editId ? '/admin/api/products/' + editId : '/admin/api/products';
  const method = editId ? 'PUT' : 'POST';
  fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': user.id
    },
    body: JSON.stringify({ nombre, descripcion, precio, stock })
  }).then(() => {
    document.getElementById('newName').value = '';
    document.getElementById('newDesc').value = '';
    document.getElementById('newPrice').value = '';
    currentStock = 0;
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

// ---- Orders management ----

function loadAdminOrders() {
  const user = JSON.parse(localStorage.getItem('user'));
  fetch('/admin/api/orders', { headers: { 'x-user-id': user.id } })
    .then(r => r.json())
    .then(data => {
      adminOrders = data;
      renderOrders();
    });
}

function renderOrders() {
  const query = (document.getElementById('searchOrders').value || '').toLowerCase();
  const container = document.getElementById('orders');
  container.innerHTML = '';
  adminOrders
    .filter(o =>
      String(o.ordenId).includes(query) ||
      (o.nombre && o.nombre.toLowerCase().includes(query)) ||
      (o.apellido && o.apellido.toLowerCase().includes(query))
    )
    .forEach(o => {
      container.innerHTML +=
        `<div>Cobranza ${o.ordenId} - ${o.nombre || ''} ${o.apellido || ''} ` +
        `(${o.usuarioId}) - ${o.metodoPago} - ${o.creadoEn} - ` +
        `${o.items} items - $${o.total} ` +
        `<button onclick="viewOrder(${o.ordenId})">Ver</button> ` +
        `<button onclick="deleteOrder(${o.ordenId})">Eliminar Cobranza</button></div>`;
    });
}

function editOrder(id) {
  const order = adminOrders.find(o => o.id === id);
  if (!order) return;
  fetch('/api/products')
    .then(r => r.json())
    .then(prods => {
      const prodList = prods.map(p => `${p.id}: ${p.nombre}`).join('\n');
      const prodId = parseInt(prompt(`Producto (ID)\n${prodList}`, order.productoId));
      if (!prods.find(p => p.id === prodId)) return alert('Producto inválido');
      const cantidad = parseInt(prompt('Cantidad', order.cantidad));
      if (!cantidad) return;
      const precio = parseFloat(prompt('Precio', order.precioProducto));
      if (!precio) return;
      const metodo = prompt(`Método de pago (${paymentMethods.join(', ')})`, order.metodoPago);
      if (!paymentMethods.includes(metodo)) return alert('Método inválido');
      fetch('/api/cobranzas/item/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId: prodId, cantidad, precioProducto: precio, metodoPago: metodo })
      }).then(() => loadAdminOrders());
    });
}

function deleteOrder(id) {
  if (!confirm('¿Eliminar la cobranza?')) return;
  fetch('/api/cobranzas/' + id, { method: 'DELETE' }).then(() => loadAdminOrders());
}

function deleteItem(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  fetch('/api/cobranzas/item/' + id, { method: 'DELETE' }).then(() => loadAdminOrders());
}

function viewOrder(id) {
  fetch('/api/cobranzas/' + id)
    .then(r => r.json())
    .then(items => {
      if (!items.length) return;
      let html = `<h3>Cobranza ${id}</h3><ul>`;
      items.forEach(it => {
        html += `<li>${it.nombreProducto} x${it.cantidad} - $${it.precioProducto}</li>`;
      });
      html += '</ul>';
      openModal(html);
    });
}

// ---- Invoice management ----

function loadAdminInvoices() {
  const user = JSON.parse(localStorage.getItem('user'));
  fetch('/admin/api/invoices', { headers: { 'x-user-id': user.id } })
    .then(r => r.json())
    .then(data => {
      adminInvoices = data;
      renderInvoices();
    });
}

function renderInvoices() {
  const query = (document.getElementById('searchInvoices').value || '').toLowerCase();
  const container = document.getElementById('invoices');
  container.innerHTML = '';
  adminInvoices
    .filter(inv =>
      String(inv.id).includes(query) ||
      String(inv.ordenId).includes(query) ||
      (inv.nombre && inv.nombre.toLowerCase().includes(query)) ||
      (inv.apellido && inv.apellido.toLowerCase().includes(query))
    )
    .forEach(inv => {
      container.innerHTML +=
        `<div>Factura ${inv.id} - Cobranza ${inv.ordenId} - ${inv.nombre || ''} ${inv.apellido || ''} - ${inv.creadoEn} ` +
        `<button onclick="viewInvoice(${inv.id})">Ver</button></div>`;
    });
}

function viewInvoice(id) {
  const user = JSON.parse(localStorage.getItem('user'));
  fetch('/admin/api/invoices/' + id, { headers: { 'x-user-id': user.id } })
    .then(r => r.json())
    .then(data => {
      if (!data.items) return;
      let total = 0;
      let html = `<h3>Factura ${data.invoice.id}</h3>`;
      html += `<p><strong>Cobranza:</strong> ${data.invoice.ordenId}</p>`;
      html += `<p><strong>Cliente:</strong> ${data.invoice.nombre || ''} ${data.invoice.apellido || ''}</p>`;
      html += '<ul>';
      data.items.forEach(it => {
        total += it.cantidad * it.precioProducto;
        html += `<li>${it.nombreProducto} x${it.cantidad} - $${it.precioProducto}</li>`;
      });
      html += '</ul>';
      html += `<p><strong>Total Factura: $${total.toFixed(2)}</strong></p>`;
      openModal(html);
    });
}

// ---- Suppliers management ----

function loadAdminSuppliers() {
  const user = JSON.parse(localStorage.getItem('user'));
  const query = document.getElementById('searchSuppliers').value || '';
  fetch('/admin/api/suppliers?search=' + encodeURIComponent(query), {
    headers: { 'x-user-id': user.id }
  })
    .then(r => r.json())
    .then(data => {
      adminSuppliers = data;
      const container = document.getElementById('suppliers');
      container.innerHTML = '';
      data.forEach(s => {
        container.innerHTML +=
          `<div>${s.nombre} - ${s.correo || ''} - ${s.telefono || ''} ` +
          `<button onclick="editSupplier(${s.id})">Editar</button> ` +
          `<button onclick="deleteSupplier(${s.id})">Eliminar</button></div>`;
      });
    });
}

function deleteSupplier(id) {
  const user = JSON.parse(localStorage.getItem('user'));
  fetch('/admin/api/suppliers/' + id, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-user-id': user.id }
  }).then(() => loadAdminSuppliers());
}

function editSupplier(id) {
  const s = adminSuppliers.find(sp => sp.id === id);
  if (!s) return;
  document.getElementById('supplierName').value = s.nombre;
  document.getElementById('supplierEmail').value = s.correo || '';
  document.getElementById('supplierPhone').value = s.telefono || '';
  document.getElementById('saveSupplierBtn').textContent = 'Guardar';
  supplierEditId = id;
}

function createSupplier() {
  const user = JSON.parse(localStorage.getItem('user'));
  const nombre = document.getElementById('supplierName').value;
  const correo = document.getElementById('supplierEmail').value;
  const telefono = document.getElementById('supplierPhone').value;
  if (!nombre || !correo) {
    alert('Nombre y correo electrónico son obligatorios');
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correo)) {
    alert('Formato de correo electrónico inválido');
    return;
  }
  const url = supplierEditId
    ? '/admin/api/suppliers/' + supplierEditId
    : '/admin/api/suppliers';
  const method = supplierEditId ? 'PUT' : 'POST';
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
    body: JSON.stringify({ nombre, correo, telefono })
  }).then(() => {
    document.getElementById('supplierName').value = '';
    document.getElementById('supplierEmail').value = '';
    document.getElementById('supplierPhone').value = '';
    document.getElementById('saveSupplierBtn').textContent = 'Agregar';
    supplierEditId = null;
    loadAdminSuppliers();
  });
}

// ---- Purchase orders management ----

function loadAdminPurchases() {
  const user = JSON.parse(localStorage.getItem('user'));
  fetch('/admin/api/purchase-orders', { headers: { 'x-user-id': user.id } })
    .then(r => r.json())
    .then(data => {
      adminPurchases = data;
      renderPurchases();
    });
}

function renderPurchases() {
  const query = (document.getElementById('searchPurchases').value || '').toLowerCase();
  const container = document.getElementById('purchases');
  container.innerHTML = '';
  const grouped = {};
  adminPurchases.forEach(it => {
    if (!grouped[it.ordenId]) {
      grouped[it.ordenId] = {
        ordenId: it.ordenId,
        proveedorId: it.proveedorId,
        proveedorNombre: it.proveedorNombre,
        creadoEn: it.creadoEn,
        items: 0,
        total: 0
      };
    }
    grouped[it.ordenId].items += 1;
    grouped[it.ordenId].total += it.cantidad * it.precioProducto;
  });
  Object.values(grouped)
    .filter(o =>
      String(o.ordenId).includes(query) ||
      (o.proveedorNombre && o.proveedorNombre.toLowerCase().includes(query))
    )
    .sort((a, b) => b.ordenId - a.ordenId)
    .forEach(o => {
      container.innerHTML +=
        `<div>Orden ${o.ordenId} - ${o.proveedorNombre || ''} (${o.proveedorId}) - ` +
        `${o.items} items - $${o.total.toFixed(2)} - ${o.creadoEn} ` +
        `<button onclick="viewPurchase(${o.ordenId})">Visualizar</button> ` +
        `<button onclick="deletePurchaseOrder(${o.ordenId})">Eliminar Orden</button></div>`;
    });
}

function createPurchase() {
  const user = JSON.parse(localStorage.getItem('user'));
  Promise.all([
    fetch('/admin/api/suppliers', { headers: { 'x-user-id': user.id } }).then(r => r.json()),
    fetch('/api/products').then(r => r.json())
  ]).then(([sups, prods]) => {
    const supList = sups.map(s => `${s.id}: ${s.nombre}`).join('\n');
    const prodList = prods.map(p => `${p.id}: ${p.nombre}`).join('\n');
    const proveedorId = parseInt(prompt(`Proveedor (ID)\n${supList}`));
    if (!proveedorId) return;
    const items = [];
    let addMore = true;
    while (addMore) {
      const productoId = parseInt(prompt(`Producto (ID)\n${prodList}`));
      if (!productoId) break;
      const cantidad = parseInt(prompt('Cantidad', '1'));
      if (!cantidad) break;
      const precio = parseFloat(prompt('Precio', '0'));
      if (!precio) break;
      items.push({ productoId, cantidad, precioProducto: precio });
      addMore = confirm('¿Agregar otro producto?');
    }
    if (!items.length) return;
    fetch('/admin/api/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ proveedorId, items })
    }).then(() => loadAdminPurchases());
  });
}

function editPurchaseItem(id) {
  const item = adminPurchases.find(p => p.id === id);
  if (!item) return;
  const user = JSON.parse(localStorage.getItem('user'));
  fetch('/api/products')
    .then(r => r.json())
    .then(prods => {
      const prodList = prods.map(p => `${p.id}: ${p.nombre}`).join('\n');
      const prodId = parseInt(prompt(`Producto (ID)\n${prodList}`, item.productoId));
      if (!prods.find(p => p.id === prodId)) return alert('Producto inválido');
      const cantidad = parseInt(prompt('Cantidad', item.cantidad));
      if (!cantidad) return;
      const precio = parseFloat(prompt('Precio', item.precioProducto));
      if (!precio) return;
      fetch('/admin/api/purchase-orders/item/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ productoId: prodId, cantidad, precioProducto: precio })
      }).then(() => loadAdminPurchases());
    });
}

function viewPurchase(id) {
  const user = JSON.parse(localStorage.getItem('user'));
  fetch('/admin/api/purchase-orders/' + id, { headers: { 'x-user-id': user.id } })
    .then(r => r.json())
    .then(items => {
      if (!items.length) return;
      let total = 0;
      let html = `<h3>Orden ${id}</h3>`;
      html += `<p><strong>Proveedor:</strong> ${items[0].proveedorNombre || ''}</p>`;
      html += '<ul>';
      items.forEach(it => {
        const subtotal = it.cantidad * it.precioProducto;
        total += subtotal;
        html += `<li>${it.nombreProducto} x${it.cantidad} - $${it.precioProducto}</li>`;
      });
      html += '</ul>';
      html += `<p><strong>Importe Total: $${total.toFixed(2)}</strong></p>`;
      openModal(html);
    });
}

function deletePurchaseItem(id) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!confirm('¿Eliminar este producto?')) return;
  fetch('/admin/api/purchase-orders/item/' + id, {
    method: 'DELETE',
    headers: { 'x-user-id': user.id }
  }).then(() => loadAdminPurchases());
}

function deletePurchaseOrder(id) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!confirm('¿Eliminar la orden de compra?')) return;
  fetch('/admin/api/purchase-orders/' + id, {
    method: 'DELETE',
    headers: { 'x-user-id': user.id }
  }).then(() => loadAdminPurchases());
}

function openModal(html) {
  document.getElementById('modalContent').innerHTML = html +
    '<button onclick="closeModal()">Cerrar</button>';
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}
