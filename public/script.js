const API_URL = 'http://localhost:3000/api';

// Handle the login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Store auth token and username
            localStorage.setItem('token', data.token);
            localStorage.setItem('currentUser', data.username);
            // Redirect to game page
            window.location.href = 'game.html';
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
        const response = await fetch(`${API_URL}/auth/register`, {
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
            // Reset form to login behavior
            document.getElementById('loginForm').onsubmit = handleLogin;
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
    
    if (loginForm.dataset.mode === 'register') {
        // Switch back to login
        h1.textContent = 'Welcome to Card Game';
        loginForm.querySelector('button').textContent = 'Login';
        document.querySelector('.register-link').innerHTML = 
            'Don\'t have an account? <a href="#" onclick="toggleRegister()">Register</a>';
        loginForm.dataset.mode = 'login';
        loginForm.onsubmit = handleLogin;
    } else {
        // Switch to register
        h1.textContent = 'Create Account';
        loginForm.querySelector('button').textContent = 'Register';
        document.querySelector('.register-link').innerHTML = 
            'Already have an account? <a href="#" onclick="toggleRegister()">Login</a>';
        loginForm.dataset.mode = 'register';
        loginForm.onsubmit = handleRegister;
    }
}

// Initialize the form
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    loginForm.dataset.mode = 'login';
});

// Check if user is already logged in
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token && window.location.pathname === '/index.html') {
        window.location.href = 'game.html';
    }
}

// Run auth check when page loads
checkAuthStatus();
