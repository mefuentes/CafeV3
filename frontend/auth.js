
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
  const firstName = document.getElementById('regFirstName').value;
  const lastName = document.getElementById('regLastName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPass').value;
  if (!email.includes('@')) {
    alert('Correo electrónico inválido');
    return;
  }
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName, email, password }),
  });
  const data = await res.json();
  alert(data.email ? "Registro exitoso" : data.error);
  if (data.email) window.location.href = "login.html";
}

async function login() {
  const email = document.getElementById('logEmail').value;
  const password = document.getElementById('logPass').value;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("user", JSON.stringify(data));
    window.location.href = "index.html";
  } else {
    alert(data.error || "Error");
  }
}
