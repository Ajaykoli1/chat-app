const socket = io(window.location.origin);
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");
const typingStatus = document.getElementById("typing-status");
const authContainer = document.getElementById("auth-container");
const chatWrapper = document.getElementById("chat-wrapper");

let currentUser = null;

// Auth Functions
function showTab(tab) {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const tabs = document.querySelectorAll(".auth-tab");
  
  tabs.forEach(t => t.classList.remove("active"));
  event.target.classList.add("active");
  
  if (tab === "login") {
    loginForm.style.display = "flex";
    registerForm.style.display = "none";
  } else {
    loginForm.style.display = "none";
    registerForm.style.display = "flex";
  }
}

// Login Form Handler
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    if (data.success) {
      currentUser = username;
      showChat();
      socket.emit('request chat history');
    } else {
      alert(data.error || "Login failed");
    }
  } catch (err) {
    alert("Error during login");
  }
});

// Registration Form Handler
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    if (data.success) {
      alert("Registration successful! Please login.");
      showTab("login");
    } else {
      alert(data.error || "Registration failed");
    }
  } catch (err) {
    alert("Error during registration");
  }
});

function showChat() {
  authContainer.style.display = "none";
  chatWrapper.style.display = "flex";
  messageInput.focus();
}

function logout() {
  currentUser = null;
  chatWrapper.style.display = "none";
  authContainer.style.display = "block";
  document.getElementById("login-form").reset();
  document.getElementById("register-form").reset();
}

// Chat Functions
function sendMessage() {
  const msg = messageInput.value.trim();
  if (!msg || !currentUser) return;

  socket.emit("chat message", { user: currentUser, msg });
  messageInput.value = "";
}

socket.on("chat message", ({ user, msg }) => {
  const msgEl = document.createElement("p");
  msgEl.textContent = `${user}: ${msg}`;
  msgEl.classList.add(user === currentUser ? "sent" : "received");
  chatBox.appendChild(msgEl);
  chatBox.scrollTop = chatBox.scrollHeight;
  typingStatus.textContent = "";
});

messageInput.addEventListener("input", () => {
  if (currentUser) socket.emit("typing", currentUser);
});

socket.on("typing", (user) => {
  if (user !== currentUser) {
    typingStatus.textContent = `${user} is typing...`;
    setTimeout(() => {
      typingStatus.textContent = "";
    }, 2000);
  }
});

socket.on("chat history", (messages) => {
  chatBox.innerHTML = "";
  messages.forEach(({ user, msg }) => {
    const msgEl = document.createElement("p");
    msgEl.textContent = `${user}: ${msg}`;
    msgEl.classList.add(user === currentUser ? "sent" : "received");
    chatBox.appendChild(msgEl);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
});
