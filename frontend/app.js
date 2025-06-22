
async function loadProducts() {
  const res = await fetch("/api/products");
  const products = await res.json();

  const container = document.getElementById("products");
  container.innerHTML = "";
  products.forEach((p) => {
    container.innerHTML += `
      <div class="product-card">
        <img src="assets/product-default.jpg" alt="Producto">
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <strong>$${p.price}</strong><br>
        <button onclick="addToCart(${p.id})">Agregar al carrito</button>
      </div>
    `;
  });
}

async function addToCart(productId) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    alert("Debes iniciar sesión");
    window.location.href = "login.html";
    return;
  }

  await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.id, productId, quantity: 1 }),
  });

  alert("Producto agregado al carrito");
  viewCart();
}

async function viewCart() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  const res = await fetch(`/api/cart?userId=${user.id}`);
  const items = await res.json();

  const cartContainer = document.getElementById("cart");
  const totalContainer = document.getElementById("cart-total");
  cartContainer.innerHTML = "";
  let total = 0;
  items.forEach((item) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    cartContainer.innerHTML += `
      <div class="cart-item">
        ${item.name} x${item.quantity} - $${subtotal}
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

function goToPayment() {
  window.location.href = "payment.html";
}

async function confirmPurchase(method) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  const res = await fetch("/api/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.id }),
  });

  const data = await res.json();
  alert(`${data.message || "Compra confirmada."}\nMétodo: ${method}`);
  window.location.href = "index.html";
}
