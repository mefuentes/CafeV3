
async function loadProducts() {
  const res = await fetch("/api/products");
  const products = await res.json();

  window.productsData = products;

  const container = document.getElementById("products");
  container.innerHTML = "";
  products.forEach((p) => {
    const action =
      p.stock > 0
        ? `<button onclick="addToCart(${p.id})">Agregar al carrito</button>`
        : '<span class="out-of-stock">Sin stock</span>';
    container.innerHTML += `
      <div class="product-card">
        <img src="${p.url || 'assets/product-default.jpg'}" alt="Producto">
        <h3>${p.nombre}</h3>
        <p>${p.descripcion}</p>
        <strong>$${p.precio}</strong><br>
        ${action}
      </div>
    `;
  });
}

async function addToCart(productoId) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    alert("Debes iniciar sesión");
    window.location.href = "login.html";
    return;
  }

  const product = (window.productsData || []).find(p => p.id === productoId);
  if (product && product.stock <= 0) {
    alert("No hay en stock");
    return;
  }

  try {
    const res = await fetch(`${window.location.origin}/api/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId: user.id, productoId, cantidad: 1 }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "No se pudo agregar el producto.");
    }
    alert("Producto agregado al carrito");
    viewCart();
  } catch (e) {
    alert(e.message || "No se pudo agregar el producto. Intenta nuevamente.");
  }
}

async function viewCart() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  const res = await fetch(`/api/cart?usuarioId=${user.id}`);
  const items = await res.json();

  const cartContainer = document.getElementById("cart");
  const totalContainer = document.getElementById("cart-total");
  cartContainer.innerHTML = "";
  let total = 0;
  items.forEach((item) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    cartContainer.innerHTML += `
      <div class="cart-item">
        ${item.nombre} x${item.cantidad} - $${subtotal}
        <button onclick="removeFromCart(${item.id})">Eliminar</button>
      </div>
    `;
  });
  totalContainer.textContent = `Total: $${total.toFixed(2)}`;
}

async function removeFromCart(itemId) {
  await fetch(`/api/cart/${itemId}`, {
    method: "DELETE",
  });
  viewCart();
}

async function goToPayment() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    alert("Debes iniciar sesión");
    window.location.href = "login.html";
    return;
  }
  try {
    const res = await fetch(`/api/cart?usuarioId=${user.id}`);
    const items = await res.json();
    if (!items.length) {
      alert("El carrito est\u00E1 vac\u00EDo");
      return;
    }
    const sinStock = items.find((i) => !i.stock || i.stock < i.cantidad);
    if (sinStock) {
      alert(`No hay stock suficiente de ${sinStock.nombre}`);
      return;
    }
    window.location.href = "pago.html";
  } catch (e) {
    alert("No se pudo verificar el carrito.");
  }
}

async function confirmPurchase(method) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;
  try {
    const cartRes = await fetch(`/api/cart?usuarioId=${user.id}`);
    const cartItems = await cartRes.json();
    if (!cartItems.length) {
      alert("El carrito est\u00E1 vac\u00EDo");
      return;
    }
    const res = await fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId: user.id, method }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo completar la compra.");
      return;
    }
    alert(`${data.message || "Compra confirmada."}\nMétodo: ${method}`);
    if (data.orderId) {
      const pdfRes = await fetch(`/api/invoice/${data.orderId}`);
      if (pdfRes.ok) {
        const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const num = data.invoiceId || data.orderId;
      a.download = `factura_${num}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      }
    }
    window.location.href = "index.html";
  } catch (e) {
    alert("No se pudo completar la compra.");
  }
}
