/**
 * Extracted script content from game-session.html
 */

const API_URL = 'http://localhost:3000/api';
const gameId = new URLSearchParams(window.location.search).get('id');
const currentUser = localStorage.getItem('currentUser');
const DEFAULT_AVATAR = './uploads/avatars/pancake_king.jpeg';
const FALLBACK_AVATAR = './uploads/avatars/default.png';

function getAvatarUrl(avatarPath) {
    const img = new Image();
    img.src = avatarPath;
    return avatarPath || DEFAULT_AVATAR || FALLBACK_AVATAR;
}

// Load game details and messages
async function loadGameDetails() {
    try {
        const [gameResponse, messagesResponse] = await Promise.all([
            fetch(`${API_URL}/games/${gameId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }),
            fetch(`${API_URL}/games/${gameId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
        ]);

        const game = await gameResponse.json();
        const messages = await messagesResponse.json();
        
        document.getElementById('gameName').textContent = game.name;
        document.querySelector('#maxPlayers').textContent = game.maxPlayers;
        document.querySelector('.player-count').textContent = game.players.length;

        const playersList = document.getElementById('playersList');
        playersList.innerHTML = game.players.map(player => `
            <div class="player-item ${player.username === currentUser ? 'current-user' : ''}">
                <div class="player-info">
                    <img src="${getAvatarUrl(player.avatar)}" alt="Avatar" class="player-avatar">
                    <div>
                        <div>${player.username}</div>
                        ${player.username === game.creator.username ? 
                            '<span class="creator-badge">Creator</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');

        const spectatorsList = document.getElementById('spectatorsList');
        const spectatorCount = document.getElementById('spectatorCount');
        spectatorCount.textContent = game.spectators.length;
        spectatorsList.innerHTML = game.spectators.map(spectator => `
            <div class="player-item">
                <div class="player-info">
                    <img src="${getAvatarUrl(spectator.avatar)}" alt="Avatar" class="player-avatar spectator-avatar">
                    <div>${spectator.username}</div>
                </div>
            </div>
        `).join('');

        const gameButtons = document.getElementById('gameButtons');
        const isPlayer = game.players.some(p => p.username === currentUser);
        const isSpectator = game.spectators.some(s => s.username === currentUser);
        
        if (isPlayer || isSpectator) {
            gameButtons.innerHTML = `
                <button class="leave-button" onclick="${isPlayer ? 'leaveGame()' : 'leaveSpectating()'}">
                    ${isPlayer ? 'Leave Game' : 'Leave Spectating'}
                </button>
            `;
        } else {
            gameButtons.innerHTML = '';
        }

        const waitingMessage = document.querySelector('.waiting-message');
        if (game.players.length >= game.maxPlayers) {
            waitingMessage.textContent = 'Starting game...';
        } else {
            waitingMessage.textContent = `Waiting for players to join... (${game.players.length}/${game.maxPlayers})`;
        }

        if (game.status === 'in_progress') {
            waitingMessage.style.display = 'none';
        } else {
            waitingMessage.style.display = 'block';
        }

        // Update chat messages
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = messages.map(message => `
            <div class="chat-message">
                <span class="message-sender">${message.sender.username}</span>
                <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
                <div class="message-text">${message.text}</div>
            </div>
        `).join('');
        
        // Auto scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Update game board display based on game status
        updateGameBoard(game);
    } catch (error) {
        console.error('Error loading game details:', error);
    }
}

// Send chat message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;

    try {
        const response = await fetch(`${API_URL}/games/${gameId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ text: message })
        });

        if (response.ok) {
            input.value = '';
            await loadGameDetails();
        } else {
            const data = await response.json();
            alert(data.message || 'Error sending message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message');
    }
}

async function leaveGame() {
    if (!confirm('Are you sure you want to leave the game?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/games/${gameId}/leave`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            window.location.href = 'game.html';
        } else {
            const data = await response.json();
            alert(data.message || 'Error leaving game');
        }
    } catch (error) {
        console.error('Error leaving game:', error);
        alert('Error leaving game');
    }
}

async function spectateGame() {
    try {
        const response = await fetch(`${API_URL}/games/${gameId}/spectate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            alert(data.message || 'Error spectating game');
            return;
        }

        loadGameDetails();
    } catch (error) {
        console.error('Error spectating game:', error);
        alert('Error spectating game');
    }
}

async function leaveSpectating() {
    try {
        const response = await fetch(`${API_URL}/games/${gameId}/leave-spectate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            window.location.href = 'game.html';
        } else {
            const data = await response.json();
            alert(data.message || 'Error leaving spectate mode');
        }
    } catch (error) {
        console.error('Error leaving spectate mode:', error);
        alert('Error leaving spectate mode');
    }
}

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
    }
}

// Initial load
checkAuth();
loadGameDetails();

// Refresh game details and messages periodically
setInterval(loadGameDetails, 2000);

// Show captured queens popup
function showCapturedQueens(event, capturedQueens) {
    let popup = document.getElementById('capturedQueensPopup');
    const gameBoard = document.querySelector('.game-board');

    // Create popup if it doesn't exist
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'capturedQueensPopup';
        popup.className = 'captured-queens-popup';
        popup.innerHTML = '<div class="captured-queens-content"></div>';
        gameBoard.appendChild(popup);
    }

    const content = popup.querySelector('.captured-queens-content');

    // Update content with captured queens
    content.innerHTML = capturedQueens.map(queen => `
        <div class="captured-queen-card" style="background-image: url('./cards/${queen}.jpeg')"></div>
    `).join('') || '<div class="empty-message">No queens captured yet</div>';

    // Show popup temporarily to get its dimensions
    popup.style.visibility = 'hidden';
    popup.style.display = 'block';
    
    // Get the dimensions and positions
    const bagRect = event.target.getBoundingClientRect();
    const boardRect = gameBoard.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    
    // Calculate relative position within the game board
    const bagTop = bagRect.top - boardRect.top;
    const bagLeft = bagRect.left - boardRect.left;
    
    // Check if we should show popup above or below the bag (inverted logic)
    const showBelow = bagTop < boardRect.height / 2;

    // Position popup
    if (showBelow) {
        popup.style.top = (bagTop + bagRect.height + 5) + 'px';
        popup.classList.add('show-below');
        popup.classList.remove('show-above');
    } else {
        popup.style.top = (bagTop - popupRect.height - 5) + 'px';
        popup.classList.add('show-above');
        popup.classList.remove('show-below');
    }

    // Center horizontally
    popup.style.left = (bagLeft + (bagRect.width / 2) - (popupRect.width / 2)) + 'px';
    
    // Make popup visible
    popup.style.visibility = 'visible';
    popup.style.display = 'none';
    popup.classList.add('visible');
}

// Hide captured queens popup
function hideCapturedQueens() {
    const popup = document.getElementById('capturedQueensPopup');
    if (popup) {
        popup.classList.remove('visible');
        // Remove after animation
        setTimeout(() => {
            popup.remove();
        }, 200);
    }
}

// Update game board with hover functionality
function updateGameBoard(game) {
    const gameBoard = document.querySelector('.game-board');
    const waitingMessage = document.querySelector('.waiting-message');

    // Always show the game board
    gameBoard.style.display = 'flex';
    
    // Update opponents area
    const opponentArea = document.getElementById('opponentArea');
    const allPlayers = game.players;
    
    // Find current user and opponent
    const currentPlayer = allPlayers.find(p => p.username === currentUser);
    const opponent = allPlayers.find(p => p.username !== currentUser);

    opponentArea.innerHTML = `
        ${opponent ? `
            <div class="player-info-box ${opponent.isCurrentTurn ? 'active' : ''}">
                <div style="display: flex; align-items: center;">
                    <img src="${getAvatarUrl(opponent.avatar)}" alt="${opponent.username}" class="player-avatar">
                    <img src="./bag.png" alt="Bag" class="user-bag" 
                         onmouseover="showCapturedQueens(event, ${JSON.stringify(opponent.capturedQueens || [])})"
                         onmouseout="hideCapturedQueens()">
                </div>
                <div class="player-name">${opponent.username}</div>
            </div>
        ` : ''}
        <div class="deck-area">
            <div class="queens-grid">
                ${Array(12).fill().map(() => `
                    <div class="queen-slot"></div>
                `).join('')}
            </div>
        </div>
        <div class="draw-pile" onclick="drawCard()">
            <div class="deck-count">${game.deckCount || 52}</div>
        </div>
        <div class="hand-deck">
            ${
                game.status === 'in_progress' && currentPlayer && currentPlayer.hand 
                ? currentPlayer.hand.map(card => `
                    <div class="card" onclick="selectCard(this)" data-card="${card}">
                        ${card}
                    </div>
                `).join('')
                : `<div class="card placeholder">
                        <img src="./cards/card_back.jpg" alt="Card Back">
                   </div>`
            }
        </div>
        ${
            currentPlayer ? `
                <div class="player-info-box ${currentPlayer.isCurrentTurn ? 'active' : ''} current-user">
                    <div style="display: flex; align-items: center;">
                        <img src="${getAvatarUrl(currentPlayer.avatar)}" alt="${currentPlayer.username}" class="player-avatar">
                        <img src="./bag.png" alt="Bag" class="user-bag" 
                             onmouseover="showCapturedQueens(event, ${JSON.stringify(currentPlayer.capturedQueens || [])})"
                             onmouseout="hideCapturedQueens()">
                    </div>
                    <div class="player-name">${currentPlayer.username}</div>
                </div>
            ` : ''
        }
    `;

    // Show/hide waiting message based on game status
    if (game.status === 'in_progress') {
        waitingMessage.style.display = 'none';
    } else {
        waitingMessage.style.display = 'block';
    }
}

// Card selection functionality
function selectCard(cardElement) {
    cardElement.classList.toggle('selected');
}

// Draw card functionality (stub)
function drawCard() {
    // TODO: Implement card drawing logic
    console.log('Drawing card...');
}
