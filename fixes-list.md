# Detailed Code-Level Fixes

## 1. Security Fixes

### Authentication Improvement
```javascript
// Replace in script.js, game-session.js, and other files
// BEFORE:
localStorage.setItem('token', data.token);
localStorage.setItem('currentUser', data.username);
localStorage.setItem('isAdmin', data.isAdmin);

// AFTER:
// Let the server set HTTP-only cookies instead
// The response should set cookies, and frontend should not store tokens
// Server-side API should be modified to use cookies for authentication
```

### Admin Authentication
```javascript
// Add to admin.html script section
async function verifyAdminStatus() {
    try {
        const response = await fetch(`${API_URL}/admin/verify`, {
            credentials: 'include' // Include cookies
        });
        
        if (!response.ok) {
            window.location.href = 'game.html';
        }
    } catch (error) {
        console.error('Admin verification error:', error);
        window.location.href = 'game.html';
    }
}

// Call this when page loads instead of just checking localStorage
document.addEventListener('DOMContentLoaded', verifyAdminStatus);
```

### Input Validation
```javascript
// Add to login form in script.js
function validateLoginForm() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username) {
        alert('Username cannot be empty');
        return false;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return false;
    }
    
    return true;
}

// Then modify handleLogin:
async function handleLogin(event) {
    event.preventDefault();
    
    if (!validateLoginForm()) return;
    
    // Rest of function...
}
```

## 2. Functionality Fixes

### Create Missing game-loader.js
```javascript
// Create this file with basic game loading utilities
// game-loader.js
const GameLoader = {
    loadGameAssets: function() {
        // Load card images
        const cardImages = [
            'card_back.jpg',
            'queen_holder.png',
            // Add other card images
        ];
        
        cardImages.forEach(img => {
            const image = new Image();
            image.src = `./cards/${img}`;
        });
        
        console.log('Game assets preloaded');
    },
    
    initializeGame: function(gameId) {
        // Initialize game state
        console.log(`Initializing game ${gameId}`);
        
        // Additional initialization logic
    }
};

// Initialize the loader when document is ready
document.addEventListener('DOMContentLoaded', () => {
    GameLoader.loadGameAssets();
    
    // Get gameId from URL if available
    const gameId = new URLSearchParams(window.location.search).get('id');
    if (gameId) {
        GameLoader.initializeGame(gameId);
    }
});
```

### Fix Avatar Handling
```javascript
// Replace in game-session.js
function getAvatarUrl(avatarPath) {
    if (!avatarPath) {
        return DEFAULT_AVATAR || FALLBACK_AVATAR;
    }
    
    // Test if avatar is accessible
    const img = new Image();
    img.onerror = () => {
        console.warn(`Avatar ${avatarPath} not accessible, using fallback`);
        return FALLBACK_AVATAR;
    };
    img.src = avatarPath;
    
    return avatarPath;
}
```

### Improve Game State Management
```javascript
// Update in game-session.js
function updateGameBoard(game) {
    const gameBoard = document.querySelector('.game-board');
    const waitingMessage = document.querySelector('.waiting-message');
    
    // Always show the game board
    gameBoard.style.display = 'flex';
    
    // Update game state based on status
    switch(game.status) {
        case 'waiting':
            waitingMessage.style.display = 'block';
            waitingMessage.textContent = `Waiting for players to join... (${game.players.length}/${game.maxPlayers})`;
            break;
            
        case 'in_progress':
            waitingMessage.style.display = 'none';
            renderGameInProgress(game);
            break;
            
        case 'completed':
            waitingMessage.style.display = 'block';
            waitingMessage.textContent = `Game completed! Winner: ${game.winner?.username || 'Unknown'}`;
            break;
            
        default:
            waitingMessage.style.display = 'block';
            waitingMessage.textContent = 'Unknown game state';
    }
    
    // Rest of function...
}

// Add helper function for in-progress rendering
function renderGameInProgress(game) {
    // Render game board for in-progress games
    const opponentArea = document.getElementById('opponentArea');
    // Existing logic...
}
```

## 3. Performance Fixes

### Replace Polling with WebSockets
```javascript
// Add to game-session.js
let socket;

function initializeWebSocket() {
    const token = localStorage.getItem('token'); // Will be cookie-based later
    socket = new WebSocket(`ws://localhost:3000/game/${gameId}?token=${token}`);
    
    socket.onopen = () => {
        console.log('WebSocket connection established');
        // Clear any existing polling intervals
        if (window.gameRefreshInterval) {
            clearInterval(window.gameRefreshInterval);
        }
    };
    
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'game_update':
                updateGameBoard(data.game);
                break;
                
            case 'chat_message':
                addChatMessage(data.message);
                break;
                
            case 'error':
                showError(data.message);
                break;
        }
    };
    
    socket.onclose = () => {
        console.log('WebSocket connection closed');
        // Fallback to polling if socket closes
        window.gameRefreshInterval = setInterval(loadGameDetails, 5000);
        // Try to reconnect after delay
        setTimeout(initializeWebSocket, 5000);
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Initialize WebSocket or fallback to polling
if ('WebSocket' in window) {
    initializeWebSocket();
} else {
    // Fallback to polling
    window.gameRefreshInterval = setInterval(loadGameDetails, 5000);
}
```

### Add Pagination to Admin Panel
```javascript
// Add to admin.html script section
let userPage = 1;
let gamePage = 1;
const PAGE_SIZE = 10;

async function loadUsers(page = 1) {
    try {
        const response = await fetch(`${API_URL}/admin/users?page=${page}&limit=${PAGE_SIZE}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        const users = data.users;
        const totalPages = data.totalPages;
        
        // Render users
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = users.length === 0 ? 
            '<tr><td colspan="4" class="empty-state">No users available</td></tr>' :
            users.map(user => `
                <!-- User row HTML -->
            `).join('');
            
        // Add pagination controls
        document.getElementById('usersPagination').innerHTML = `
            <button onclick="loadUsers(${page-1})" ${page === 1 ? 'disabled' : ''}>Previous</button>
            <span>Page ${page} of ${totalPages}</span>
            <button onclick="loadUsers(${page+1})" ${page === totalPages ? 'disabled' : ''}>Next</button>
        `;
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Similar function for loadGames
```

### Optimize Animations
```css
/* Add to game-session.css */
.queen-slot:hover,
.card:hover,
.draw-pile:hover {
    will-change: transform;
}

/* Reduce animation complexity on mobile */
@media (max-width: 768px) {
    @keyframes starTwinkle {
        0%, 100% { opacity: 0.3; }
    }
    
    .game-area::before {
        background-size: 450px 450px, 250px 250px;
        background-position: 0 0, 40px 60px;
        animation: none; /* Disable animation on mobile */
    }
}
```

## 4. User Experience Fixes

### Add Loading Indicators
```javascript
// Add utility functions to script.js or a new helpers.js file
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('loading');
        element.innerHTML = '<div class="spinner"></div>';
    }
}

function hideLoading(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('loading');
        if (content) {
            element.innerHTML = content;
        }
    }
}

// Use in API calls, for example in game.html:
async function loadGames() {
    showLoading('gamesList');
    try {
        // API call...
        displayGames(games);
    } catch (error) {
        console.error('Error loading games:', error);
        document.getElementById('gamesList').innerHTML = 
            '<div class="error-message">Failed to load games. Please try again.</div>';
    } finally {
        hideLoading('gamesList');
    }
}
```

### Add Loading Spinner CSS
```css
/* Add to styles.css */
.spinner {
    width: 40px;
    height: 40px;
    margin: 20px auto;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top-color: #4CAF50;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading {
    opacity: 0.7;
    pointer-events: none;
}

.error-message {
    padding: 20px;
    text-align: center;
    color: #ff4444;
    background: rgba(255, 0, 0, 0.1);
    border-radius: 5px;
}
```

### Add Confirmation Dialogs
```javascript
// Add to admin.html for delete user
function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    // Additional confirmation for extra safety
    const username = document.querySelector(`[data-user-id="${userId}"]`).getAttribute('data-username');
    const confirmUsername = prompt(`Type "${username}" to confirm deletion:`);
    
    if (confirmUsername !== username) {
        alert('Username did not match. Deletion cancelled.');
        return;
    }
    
    // Proceed with deletion...
}
```

## 5. Accessibility Improvements

### Add ARIA Attributes
```html
<!-- Update login form in index.html -->
<form id="loginForm" onsubmit="return handleLogin(event)" aria-labelledby="formTitle">
    <h1 id="formTitle">Welcome to Card Game</h1>
    <div class="form-group">
        <label for="username" id="usernameLabel">Username</label>
        <input type="text" id="username" name="username" required aria-labelledby="usernameLabel" aria-required="true">
    </div>
    <!-- Similar for other form elements -->
</form>
```

### Improve Color Contrast
```css
/* Update in styles.css */
.register-link {
    color: #444; /* Darker than original #666 for better contrast */
}

.button-primary {
    background: #0056b3; /* Darker blue for better contrast against white text */
}

/* Similar updates for other color pairs with poor contrast */
```

### Keyboard Navigation
```javascript
// Add to game-session.js for card selection via keyboard
function makeCardsKeyboardAccessible() {
    const cards = document.querySelectorAll('.card:not(.placeholder)');
    
    cards.forEach(card => {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Card ${card.dataset.card}`);
        
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                // Trigger same action as click
                selectCard(this);
                e.preventDefault();
            }
        });
    });
}

// Call this function after updating game board
```
