import CONFIG from '../config.js';

// Handle the login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Store auth token, username and admin status
            localStorage.setItem('token', data.token);
            localStorage.setItem('currentUser', data.username);
            localStorage.setItem('isAdmin', data.isAdmin);
            
            // Redirect based on user role
            if (data.isAdmin) {
                window.location.href = '/admin/admin.html';
            } else {
                window.location.href = '/waiting_room/game.html';
            }
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Error logging in. Please try again.');
    }
}

// Handle the registration form submission
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful! Please log in.');
            // Switch back to login form
            toggleRegister();
        } else {
            alert(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Error registering. Please try again.');
    }
}

// Toggle between login and registration forms
function toggleRegister() {
    const loginForm = document.getElementById('loginForm');
    const h1 = document.querySelector('h1');
    const registerLink = document.querySelector('.register-link');
    
    if (loginForm.dataset.mode === 'register') {
        // Switch back to login
        h1.textContent = 'Welcome to Card Game';
        loginForm.querySelector('button').textContent = 'Login';
        registerLink.innerHTML = 'Don\'t have an account? <a href="#" class="register-toggle">Register</a>';
        loginForm.dataset.mode = 'login';
        loginForm.removeEventListener('submit', handleRegister);
        loginForm.addEventListener('submit', handleLogin);
    } else {
        // Switch to register
        h1.textContent = 'Create Account';
        loginForm.querySelector('button').textContent = 'Register';
        registerLink.innerHTML = 'Already have an account? <a href="#" class="register-toggle">Login</a>';
        loginForm.dataset.mode = 'register';
        loginForm.removeEventListener('submit', handleLogin);
        loginForm.addEventListener('submit', handleRegister);
    }
    
    // Re-attach click event to the new toggle link
    document.querySelector('.register-toggle').addEventListener('click', (e) => {
        e.preventDefault();
        toggleRegister();
    });
}

// Initialize event listeners and form state
function initializeApp() {
    const loginForm = document.getElementById('loginForm');
    const registerToggle = document.querySelector('.register-toggle');

    loginForm.dataset.mode = 'login';
    loginForm.addEventListener('submit', handleLogin);
    registerToggle.addEventListener('click', (e) => {
        e.preventDefault();
        toggleRegister();
    });

    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token && window.location.pathname === '/index.html') {
        window.location.href = '/waiting_room/game.html';
    }
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
