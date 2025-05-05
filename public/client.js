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

// Add file upload handling
const fileInput = document.getElementById('file-input');
const fileBtn = document.querySelector('.file-btn');

fileBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', currentUser);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            // Emit the file message
            socket.emit('chat message', {
                username: currentUser,
                message: data.fileUrl,
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileType: data.fileType
            });
        } else {
            alert('Error uploading file: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error uploading file');
    }

    // Clear the file input
    fileInput.value = '';
});

// Update the message display function to handle files
function addMessage(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.username === currentUser ? 'sent' : 'received'}`;
    
    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = msg.username;
    messageDiv.appendChild(header);

    if (msg.fileUrl) {
        const fileContent = document.createElement('div');
        fileContent.className = 'file-content';

        if (msg.fileType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = msg.fileUrl;
            img.className = 'file-preview';
            img.alt = msg.fileName;
            fileContent.appendChild(img);
        } else {
            const fileAttachment = document.createElement('div');
            fileAttachment.className = 'file-attachment';
            
            const icon = document.createElement('img');
            icon.src = getFileIcon(msg.fileType);
            icon.alt = 'File icon';
            
            const link = document.createElement('a');
            link.href = msg.fileUrl;
            link.textContent = msg.fileName;
            link.target = '_blank';
            
            fileAttachment.appendChild(icon);
            fileAttachment.appendChild(link);
            fileContent.appendChild(fileAttachment);
        }
        
        messageDiv.appendChild(fileContent);
    }

    if (msg.message) {
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = msg.message;
        messageDiv.appendChild(content);
    }

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Helper function to get file icon based on type
function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return '/icons/image.png';
    if (fileType === 'application/pdf') return '/icons/pdf.png';
    if (fileType.includes('document') || fileType.includes('text')) return '/icons/document.png';
    return '/icons/file.png';
}
