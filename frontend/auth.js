
function checkSession() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) window.location.href = "login.html";
}

function logout() {
  localStorage.removeItem("user");
  // Al cerrar sesión volvemos a la página principal
  window.location.href = "landing.html";
}

async function register() {
  const nombre = document.getElementById('regFirstName').value;
  const apellido = document.getElementById('regLastName').value;
  const correo = document.getElementById('regEmail').value;
  const contrasena = document.getElementById('regPass').value;
  if (!correo.includes('@')) {
    alert('Correo electrónico inválido');
    return;
  }
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, apellido, correo, contrasena }),
  });
  const data = await res.json();
  alert(data.correo ? "Registro exitoso" : data.error);
  if (data.correo) window.location.href = "login.html";
}

async function login() {
  const correo = document.getElementById('logEmail').value;
  const contrasena = document.getElementById('logPass').value;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, contrasena }),
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("user", JSON.stringify(data));
    window.location.href = "index.html";
  } else {
    alert(data.error || "Error");
  }
}
