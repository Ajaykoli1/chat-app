const socket = io(window.location.origin);
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");
const typingStatus = document.getElementById("typing-status");
const authContainer = document.getElementById("auth-container");
const chatWrapper = document.getElementById("chat-wrapper");

let currentUser = null;
let isAdmin = false;

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
      isAdmin = data.isAdmin;
      showChat();
      socket.emit('request chat history');
      
      // Add admin clear button if user is admin
      if (isAdmin) {
        addAdminClearButton();
      }
    } else {
      alert(data.error || "Login failed");
    }
  } catch (err) {
    console.error('Login error:', err);
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

// Admin Functions
function addAdminClearButton() {
  // Remove existing button if any
  const existingButton = document.getElementById('admin-clear-button');
  if (existingButton) {
    existingButton.remove();
  }

  const clearButton = document.createElement('button');
  clearButton.id = 'admin-clear-button';
  clearButton.textContent = 'Clear Chat History';
  clearButton.style.position = 'absolute';
  clearButton.style.top = '10px';
  clearButton.style.right = '10px';
  clearButton.style.padding = '5px 10px';
  clearButton.style.background = '#dc3545';
  clearButton.style.color = 'white';
  clearButton.style.border = 'none';
  clearButton.style.borderRadius = '4px';
  clearButton.style.cursor = 'pointer';
  clearButton.onclick = clearChatHistory;

  document.querySelector('.chat-header').appendChild(clearButton);
}

async function clearChatHistory() {
  if (!isAdmin) {
    alert('Only administrators can clear chat history');
    return;
  }
  
  if (!confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch('/clear-chat-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, isAdmin })
    });
    
    const data = await response.json();
    if (data.success) {
      chatBox.innerHTML = '';
      console.log('Chat history cleared successfully');
    } else {
      alert(data.error || 'Failed to clear chat history');
    }
  } catch (err) {
    console.error('Error clearing chat history:', err);
    alert('Error clearing chat history');
  }
}

// Chat Functions
function sendMessage() {
  const msg = messageInput.value.trim();
  if (!msg || !currentUser) return;

  console.log('Sending message:', { user: currentUser, msg });
  socket.emit("chat message", { user: currentUser, msg });
  messageInput.value = "";
}

socket.on("chat message", ({ user, msg }) => {
  console.log('Received message:', { user, msg });
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
  console.log('Received chat history:', messages);
  if (!Array.isArray(messages)) {
    console.error('Chat history is not an array:', messages);
    return;
  }
  
  chatBox.innerHTML = "";
  messages.forEach(({ user, msg }) => {
    console.log('Processing message:', { user, msg });
    const msgEl = document.createElement("p");
    msgEl.textContent = `${user}: ${msg}`;
    msgEl.classList.add(user === currentUser ? "sent" : "received");
    chatBox.appendChild(msgEl);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
});

// Logout Function
function logout() {
  currentUser = null;
  isAdmin = false;
  chatWrapper.style.display = "none";
  authContainer.style.display = "block";
  document.getElementById("login-form").reset();
  document.getElementById("register-form").reset();
  
  // Remove admin clear button if it exists
  const clearButton = document.getElementById('admin-clear-button');
  if (clearButton) {
    clearButton.remove();
  }
}
