
async function loadProducts() {
  const res = await fetch("http://localhost:3000/api/products");
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

  await fetch("http://localhost:3000/api/cart", {
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

  const res = await fetch(`http://localhost:3000/api/cart?userId=${user.id}`);
  const items = await res.json();

  const cartContainer = document.getElementById("cart");
  cartContainer.innerHTML = "";
  items.forEach((item) => {
    cartContainer.innerHTML += `
      <div class="cart-item">
        ${item.name} x${item.quantity} - $${item.price * item.quantity}
        <button onclick="removeFromCart(${item.id})">Eliminar</button>
      </div>
    `;
  });
}

async function removeFromCart(itemId) {
  await fetch(`http://localhost:3000/api/cart/${itemId}`, {
    method: "DELETE",
  });
  viewCart();
}

async function confirmPurchase() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  const res = await fetch("http://localhost:3000/api/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.id }),
  });

  const data = await res.json();
  alert(data.message || "Compra confirmada.");
  viewCart();
}
