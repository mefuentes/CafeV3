async function loadLandingProducts() {
  const res = await fetch('/api/products');
  const products = await res.json();
  const container = document.getElementById('landing-products');
  container.innerHTML = '';
  products.forEach(p => {
    container.innerHTML += `
      <div class="product-card">
        <img src="assets/product-default.jpg" alt="Producto">
        <h3>${p.nombre}</h3>
        <p>${p.descripcion}</p>
      </div>
    `;
  });
}
window.addEventListener('DOMContentLoaded', loadLandingProducts);
