let socket = io();
let username = '';
let isAdmin = false;
let typingTimeout;

// DOM Elements
const authContainer = document.getElementById('auth-container');
const chatWrapper = document.getElementById('chat-wrapper');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message');
const typingStatus = document.getElementById('typing-status');

// Show/Hide Auth Tabs
function showTab(tab) {
  const tabs = document.querySelectorAll('.auth-tab');
  tabs.forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
}

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();

    if (data.success) {
      window.username = username;
      isAdmin = data.isAdmin;
      authContainer.style.display = 'none';
      chatWrapper.style.display = 'flex';
      if (isAdmin) {
        addAdminClearButton();
      }
      messageInput.focus();
    } else {
      showAlert('Invalid credentials', 'danger');
    }
  } catch (err) {
    showAlert('Login failed', 'danger');
  }
});

// Register Form Handler
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (password !== confirmPassword) {
    showAlert('Passwords do not match', 'danger');
    return;
  }

  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();

    if (data.success) {
      showAlert('Registration successful! Please login.', 'success');
      showTab('login');
    } else {
      showAlert(data.error || 'Registration failed', 'danger');
    }
  } catch (err) {
    showAlert('Registration failed', 'danger');
  }
});

// Send Message
function sendMessage() {
  const message = messageInput.value.trim();
  if (message) {
    socket.emit('chat message', { user: username, msg: message });
    messageInput.value = '';
    messageInput.focus();
  }
}

// Handle Enter Key
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Handle Typing
messageInput.addEventListener('input', () => {
  socket.emit('typing', username);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    typingStatus.textContent = '';
  }, 1000);
});

// Socket Event Handlers
socket.on('chat message', (data) => {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${data.user === username ? 'sent' : 'received'}`;
  
  const userSpan = document.createElement('div');
  userSpan.className = 'user';
  userSpan.textContent = data.user;
  
  const msgSpan = document.createElement('div');
  msgSpan.className = 'msg';
  msgSpan.textContent = data.msg;
  
  const timeSpan = document.createElement('div');
  timeSpan.className = 'time';
  timeSpan.textContent = new Date().toLocaleTimeString();
  
  messageDiv.appendChild(userSpan);
  messageDiv.appendChild(msgSpan);
  messageDiv.appendChild(timeSpan);
  
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on('typing', (user) => {
  if (user !== username) {
    typingStatus.textContent = `${user} is typing...`;
  }
});

socket.on('chat history', (messages) => {
  chatBox.innerHTML = '';
  messages.forEach(data => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${data.user === username ? 'sent' : 'received'}`;
    
    const userSpan = document.createElement('div');
    userSpan.className = 'user';
    userSpan.textContent = data.user;
    
    const msgSpan = document.createElement('div');
    msgSpan.className = 'msg';
    msgSpan.textContent = data.msg;
    
    const timeSpan = document.createElement('div');
    timeSpan.className = 'time';
    timeSpan.textContent = new Date(data.created_at).toLocaleTimeString();
    
    messageDiv.appendChild(userSpan);
    messageDiv.appendChild(msgSpan);
    messageDiv.appendChild(timeSpan);
    
    chatBox.appendChild(messageDiv);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
});

// Logout Function
function logout() {
  window.username = '';
  isAdmin = false;
  authContainer.style.display = 'flex';
  chatWrapper.style.display = 'none';
  chatBox.innerHTML = '';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('register-username').value = '';
  document.getElementById('register-password').value = '';
  document.getElementById('confirm-password').value = '';
  showTab('login');
}

// Add Admin Clear Button
function addAdminClearButton() {
  const clearButton = document.createElement('button');
  clearButton.className = 'btn btn-danger btn-sm admin-clear-btn';
  clearButton.innerHTML = '<i class="fas fa-trash-alt me-1"></i>Clear Chat';
  clearButton.onclick = clearChatHistory;
  chatWrapper.appendChild(clearButton);
}

// Clear Chat History
async function clearChatHistory() {
  if (!isAdmin) return;
  
  if (confirm('Are you sure you want to clear all chat history?')) {
    try {
      const response = await fetch('/clear-chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, isAdmin })
      });
      const data = await response.json();
      
      if (data.success) {
        chatBox.innerHTML = '';
        showAlert('Chat history cleared', 'success');
      } else {
        showAlert('Failed to clear chat history', 'danger');
      }
    } catch (err) {
      showAlert('Failed to clear chat history', 'danger');
    }
  }
}

// Show Alert
function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  const container = document.querySelector('.auth-box');
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}
