/**
 * Sleeping Queens Game Loader
 * This script loads the Sleeping Queens game module into the game-area div
 */

// API endpoint URL
const API_URL = 'http://localhost:3000/api';

// Game instance
let gameInstance = null;

// Initialize and load game module
const loadSleepingQueensGame = () => {
    // Get game ID from URL
    const gameId = new URLSearchParams(window.location.search).get('id');
    if (!gameId) {
        console.error('No game ID found in URL');
        return;
    }

    // Get current user
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        console.error('No current user found');
        return;
    }

    // Get the game area container
    const gameArea = document.querySelector('.game-area');
    if (!gameArea) {
        console.error('Game area not found');
        return;
    }

    // Load the game scripts
    loadGameScripts(() => {
        // Check if game is in progress from API
        checkGameStatus(gameId, (isInProgress) => {
            if (isInProgress) {
                // Hide waiting message
                const waitingMessage = gameArea.querySelector('.waiting-message');
                if (waitingMessage) {
                    waitingMessage.style.display = 'none';
                }
                
                // Initialize the game
                if (window.SleepingQueensGame) {
                    gameInstance = window.SleepingQueensGame.init(gameId, currentUser, API_URL, gameArea);
                    console.log('Sleeping Queens game initialized');
                } else {
                    console.error('Sleeping Queens game module not found');
                }
            } else {
                // Game not in progress, update waiting message
                const waitingMessage = gameArea.querySelector('.waiting-message');
                if (waitingMessage) {
                    checkPlayerCount(gameId, (current, max) => {
                        waitingMessage.textContent = `Waiting for players to join... (${current}/${max})`;
                    });
                }
            }
        });
    });
};

// Load required script files
const loadGameScripts = (callback) => {
    // Load the CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'sleeping-queens-styles.css';
    document.head.appendChild(cssLink);
    
    // Load the main game script
    const script = document.createElement('script');
    script.src = 'sleeping-queens-game.js';
    script.onload = callback;
    script.onerror = () => {
        console.error('Failed to load Sleeping Queens game script');
    };
    document.body.appendChild(script);
};

// Check if game is in progress
const checkGameStatus = (gameId, callback) => {
    fetch(`${API_URL}/games/${gameId}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(game => {
        callback(game.status === 'in_progress');
    })
    .catch(error => {
        console.error('Error checking game status:', error);
        callback(false);
    });
};

// Check player count for waiting message
const checkPlayerCount = (gameId, callback) => {
    fetch(`${API_URL}/games/${gameId}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(game => {
        callback(game.players.length, game.maxPlayers);
    })
    .catch(error => {
        console.error('Error checking player count:', error);
        callback(0, 0);
    });
};

// Clean up game when leaving
const cleanupGame = () => {
    if (gameInstance && typeof gameInstance.cleanup === 'function') {
        gameInstance.cleanup();
        gameInstance = null;
    }
};

// Check for game status changes
const setupGameStatusPolling = () => {
    // Get game ID from URL
    const gameId = new URLSearchParams(window.location.search).get('id');
    if (!gameId) return;

    let previousStatus = null;
    
    // Poll for game status changes
    const pollInterval = setInterval(() => {
        fetch(`${API_URL}/games/${gameId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(game => {
            // If status changed from waiting to in_progress, load the game
            if (previousStatus === 'waiting' && game.status === 'in_progress') {
                loadSleepingQueensGame();
            }
            
            previousStatus = game.status;
        })
        .catch(error => {
            console.error('Error polling game status:', error);
        });
    }, 2000); // Check every 2 seconds
    
    // Store interval ID on window for cleanup
    window.gameStatusPollingInterval = pollInterval;
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if on game session page
    if (window.location.pathname.includes('game-session.html')) {
        // Initial load attempt
        loadSleepingQueensGame();
        
        // Setup polling for game status changes
        setupGameStatusPolling();
    }
});

// Clean up when leaving the page
window.addEventListener('beforeunload', () => {
    cleanupGame();
    
    // Clear polling interval
    if (window.gameStatusPollingInterval) {
        clearInterval(window.gameStatusPollingInterval);
    }
});
