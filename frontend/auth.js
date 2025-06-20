
function checkSession() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) window.location.href = "login.html";
}

function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

async function register() {
  const username = document.getElementById('regUser').value;
  const password = document.getElementById('regPass').value;
  const res = await fetch("http://localhost:3000/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  alert(data.username ? "Registro exitoso" : data.error);
  if (data.username) window.location.href = "login.html";
}

async function login() {
  const username = document.getElementById('logUser').value;
  const password = document.getElementById('logPass').value;
  const res = await fetch("http://localhost:3000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("user", JSON.stringify(data));
    window.location.href = "index.html";
  } else {
    alert(data.error || "Error");
  }
}
