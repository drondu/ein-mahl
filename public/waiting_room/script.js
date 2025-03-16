import CONFIG from '../config.js';

// Game state
const currentUser = localStorage.getItem('currentUser');
let gameToDelete = null;

// Getter for gameToDelete to maintain encapsulation
export function getGameToDelete() {
    return gameToDelete;
}

// Modal functions
export function openDeleteModal(gameId) {
    gameToDelete = gameId;
    document.getElementById('deleteGameModal').classList.add('active');
}

export function closeDeleteModal() {
    gameToDelete = null;
    document.getElementById('deleteGameModal').classList.remove('active');
}

export function openCreateGameModal() {
    document.getElementById('createGameModal').classList.add('active');
}

export function closeCreateGameModal() {
    document.getElementById('createGameModal').classList.remove('active');
    document.getElementById('gameName').value = '';
}

// Chat functions
export async function loadGlobalChat() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/chat/global`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const messages = await response.json();
        
        const chatContainer = document.getElementById('globalChat');
        chatContainer.innerHTML = messages.map(message => `
            <div class="chat-message">
                <span class="message-sender">${message.sender.username}</span>
                <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
                <div class="message-text">${message.text}</div>
            </div>
        `).join('');
        
        chatContainer.scrollTop = chatContainer.scrollHeight;
    } catch (error) {
        console.error('Error loading chat messages:', error);
    }
}

export async function sendGlobalMessage() {
    const input = document.getElementById('globalMessageInput');
    const message = input.value.trim();
    
    if (!message) return;

    try {
        const response = await fetch(`${CONFIG.API_URL}/chat/global`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ text: message })
        });

        if (response.ok) {
            input.value = '';
            await loadGlobalChat();
        } else {
            const data = await response.json();
            alert(data.message || 'Error sending message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message');
    }
}

// Game management functions
export async function handleCreateGame(event) {
    event.preventDefault();
    const name = document.getElementById('gameName').value;
    const maxPlayers = document.getElementById('maxPlayers').value;
    
    if (!name) {
        alert('Please enter a game name');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/games`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ name, maxPlayers: parseInt(maxPlayers) })
        });

        if (response.ok) {
            const game = await response.json();
            closeCreateGameModal();
            window.location.href = `/game_session/game-session.html?id=${game._id}`;
        } else {
            const data = await response.json();
            alert(data.message || 'Error creating game');
        }
    } catch (error) {
        console.error('Error creating game:', error);
        alert('Error creating game');
    }
}

async function loadProfile() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const user = await response.json();
        
        document.getElementById('profileUsername').textContent = user.username;
        const profileAvatar = document.getElementById('profileAvatar');
        let avatarSrc = user.avatar;
        if (!avatarSrc || avatarSrc === 'default') {
            avatarSrc = CONFIG.DEFAULT_AVATAR;
        }

        // Create a new image element
        const img = new Image();
        img.onload = () => {
            profileAvatar.innerHTML = `<img src="${avatarSrc}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        };
        img.onerror = () => {
            // If default avatar fails, use fallback
            profileAvatar.innerHTML = `<img src="${CONFIG.FALLBACK_AVATAR}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        };
        img.src = avatarSrc;
        // Update stats safely handling the stats object structure
        const stats = user.stats || { gamesPlayed: 0, gamesWon: 0 };
        document.getElementById('gamesPlayed').textContent = stats.gamesPlayed || 0;
        document.getElementById('gamesWon').textContent = stats.gamesWon || 0;

        // Show/hide admin button based on user role
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        document.getElementById('adminButton').style.display = isAdmin ? 'block' : 'none';
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadTopPlayers() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/top-players`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const topPlayers = await response.json();
        
        const topPlayersList = document.querySelector('.top-players-list');
        topPlayersList.innerHTML = '';
        
        const medals = ['🥇', '🥈', '🥉'];
        topPlayers.forEach((player, index) => {
            const li = document.createElement('li');
            li.className = 'top-player-item';
            li.innerHTML = `
                <span>${medals[index]} ${player.username}</span>
                <span>${player.gamesWon} wins</span>
            `;
            topPlayersList.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading top players:', error);
    }
}

async function loadGames() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/games`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const games = await response.json();
        displayGames(games);
    } catch (error) {
        console.error('Error loading games:', error);
    }
}

function displayGames(games) {
    const gamesList = document.getElementById('gamesList');
    gamesList.innerHTML = '';

    games.forEach(game => {
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';
        
        const isJoined = game.players.some(player => player.username === currentUser);
        const isFull = game.players.length >= game.maxPlayers;
        
        gameCard.innerHTML = `
            <div class="game-details">
                <h3>${game.name}</h3>
                <div class="game-info">Status: ${game.status}</div>
                <div class="game-info">Players: ${game.players.map(p => p.username).join(', ')}</div>
                <div class="game-info">Created by: ${game.creator.username}</div>
                <div class="game-info">Max Players: ${game.maxPlayers}</div>
            </div>
            <div class="game-actions">
                <button 
                    class="button-join" 
                    onclick="${isJoined ? 
                        `window.location.href='/game_session/game-session.html?id=${game._id}'` : 
                        `joinGame('${game._id}')`}"
                    ${(!isJoined && (isFull || game.status !== 'waiting')) ? 'disabled' : ''}
                >
                    ${isJoined ? 'Return to Game' : 
                      game.status !== 'waiting' ? 'Game In Progress' : 
                      isFull ? 'Game Full' :
                      'Join Game'}
                </button>
                ${game.status === 'in_progress' && !isJoined ? 
                    `<button 
                        class="button-join" 
                        onclick="spectateGame('${game._id}')"
                        style="background: #0d6efd;"
                    >
                        Spectate Game
                    </button>` : ''}
                ${(game.creator.username === currentUser && game.players.length <= 1) ? 
                    `<button 
                        class="button-delete" 
                        onclick="openDeleteModal('${game._id}')"
                    >
                        Delete Game
                    </button>` : 
                    ''}
            </div>
        `;
        
        gamesList.appendChild(gameCard);
    });
}

export async function deleteGame(gameId) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/games/${gameId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            loadGames();
        } else {
            const data = await response.json();
            alert(data.message || 'Error deleting game');
        }
    } catch (error) {
        console.error('Error deleting game:', error);
        alert('Error deleting game');
    }
}

export async function joinGame(gameId) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/games/${gameId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            window.location.href = `/game_session/game-session.html?id=${gameId}`;
        } else {
            const data = await response.json();
            alert(data.message || 'Error joining game');
        }
    } catch (error) {
        console.error('Error joining game:', error);
        alert('Error joining game');
    }
}

export async function spectateGame(gameId) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/games/${gameId}/spectate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            window.location.href = `/game_session/game-session.html?id=${gameId}`;
        } else {
            const data = await response.json();
            alert(data.message || 'Error spectating game');
        }
    } catch (error) {
        console.error('Error spectating game:', error);
        alert('Error spectating game');
    }
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    window.location.href = '/main_page/index.html';
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/main_page/index.html';
    }
}

// Initialize
export function initializeApp() {
    checkAuth();
    loadProfile();
    loadTopPlayers();
    loadGames();
    loadGlobalChat();
    
    // Set up event listeners
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                if (modal.id === 'createGameModal') {
                    closeCreateGameModal();
                } else if (modal.id === 'deleteGameModal') {
                    closeDeleteModal();
                }
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeCreateGameModal();
            closeDeleteModal();
        }
    });

    // Refresh data periodically
    setInterval(() => {
        loadGames();
        loadProfile();
        loadTopPlayers();
        loadGlobalChat();
    }, 5000);
}

// Initialize the app when the module loads
initializeApp();
