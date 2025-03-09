/**
 * Sleeping Queens Game Module
 * This module handles the game logic and UI for Sleeping Queens card game
 */

class SleepingQueensGame {
    constructor(gameId, currentPlayer, apiUrl) {
        this.gameId = gameId;
        this.currentPlayer = currentPlayer;
        this.apiUrl = apiUrl;
        this.gameState = null;
        this.players = [];
        this.currentTurn = null;
        this.gameContainer = null;
        this.selectedCards = [];
        this.pollingInterval = null;
    }

    /**
     * Initialize the game UI and start the game
     * @param {HTMLElement} container - The container element to render the game in
     */
    async init(container) {
        this.gameContainer = container;
        this.gameContainer.innerHTML = '<div class="loading-game">Loading game...</div>';
        
        try {
            // Get initial game state
            await this.fetchGameState();
            
            // Render initial game UI
            this.renderGameUI();
            
            // Start polling for game updates
            this.startPolling();
            
            console.log('Sleeping Queens Game initialized');
        } catch (error) {
            console.error('Error initializing game:', error);
            this.gameContainer.innerHTML = '<div class="game-error">Error loading game. Please try refreshing.</div>';
        }
    }

    /**
     * Fetch the current game state from the server
     */
    async fetchGameState() {
        try {
            const response = await fetch(`${this.apiUrl}/games/${this.gameId}/state`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch game state');
            }
            
            const data = await response.json();
            this.gameState = data;
            this.players = data.players;
            this.currentTurn = data.currentTurn;
            
            return data;
        } catch (error) {
            console.error('Error fetching game state:', error);
            throw error;
        }
    }

    /**
     * Start polling for game state updates
     */
    startPolling() {
        // Clear any existing polling
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        // Poll every 2 seconds
        this.pollingInterval = setInterval(async () => {
            try {
                const newState = await this.fetchGameState();
                
                // Check if the game state has changed
                if (JSON.stringify(this.gameState) !== JSON.stringify(newState)) {
                    this.renderGameUI();
                }
            } catch (error) {
                console.error('Error in polling:', error);
            }
        }, 2000);
    }

    /**
     * Stop polling for game updates
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Render the game UI based on current game state
     */
    renderGameUI() {
        if (!this.gameState) {
            return;
        }

        // Create main game container
        const gameHTML = `
            <div class="queens-game">
                <div class="game-board">
                    <div class="sleeping-queens-area">
                        <h3>Sleeping Queens</h3>
                        <div class="queens-container" id="sleeping-queens"></div>
                    </div>
                    
                    <div class="draw-discard-pile">
                        <div class="pile draw-pile" id="draw-pile">
                            <div class="card card-back"></div>
                            <div class="pile-label">Draw Pile</div>
                        </div>
                        <div class="pile discard-pile" id="discard-pile">
                            <div class="pile-label">Discard Pile</div>
                        </div>
                    </div>
                    
                    <div class="players-area" id="players-area"></div>
                </div>
                
                <div class="game-controls">
                    <div class="game-status" id="game-status">
                        ${this.currentTurn.username === this.currentPlayer ? 
                            '<div class="your-turn">Your Turn!</div>' : 
                            `<div class="waiting-turn">Waiting for ${this.currentTurn.username} to play...</div>`}
                    </div>
                    <div class="action-buttons" id="action-buttons">
                        ${this.currentTurn.username === this.currentPlayer ? 
                            '<button id="play-cards-btn" class="play-button" disabled>Play Selected Cards</button>' : ''}
                    </div>
                </div>
            </div>
        `;
        
        this.gameContainer.innerHTML = gameHTML;
        
        // Render sleeping queens
        this.renderSleepingQueens();
        
        // Render players' areas (hands and awake queens)
        this.renderPlayersArea();
        
        // Attach event handlers
        this.attachEventHandlers();
    }

    /**
     * Render the sleeping queens on the board
     */
    renderSleepingQueens() {
        const queensContainer = document.getElementById('sleeping-queens');
        if (!queensContainer) return;
        
        let queensHTML = '';
        
        for (const queen of this.gameState.sleepingQueens) {
            queensHTML += `
                <div class="card queen-card sleeping-queen" data-queen-id="${queen.id}">
                    <div class="card-content">
                        <div class="queen-name">${queen.name}</div>
                        <div class="queen-points">${queen.points} pts</div>
                    </div>
                </div>
            `;
        }
        
        queensContainer.innerHTML = queensHTML;
    }

    /**
     * Render players' areas including hands and awake queens
     */
    renderPlayersArea() {
        const playersArea = document.getElementById('players-area');
        if (!playersArea) return;
        
        let playersHTML = '';
        
        for (const player of this.players) {
            const isCurrentPlayer = player.username === this.currentPlayer;
            const isPlayerTurn = player.username === this.currentTurn.username;
            
            // Create player section
            playersHTML += `
                <div class="player-section ${isCurrentPlayer ? 'current-player' : ''} ${isPlayerTurn ? 'player-turn' : ''}">
                    <div class="player-info">
                        <div class="player-name">${player.username}</div>
                        <div class="player-score">Score: ${this.calculatePlayerScore(player)}</div>
                    </div>
                    
                    <div class="player-queens">
                        <h4>Awake Queens</h4>
                        <div class="awake-queens-container">
                            ${this.renderPlayerQueens(player)}
                        </div>
                    </div>
                    
                    <div class="player-hand ${isCurrentPlayer ? 'my-hand' : 'opponent-hand'}">
                        <h4>Hand</h4>
                        <div class="hand-cards">
                            ${this.renderPlayerHand(player, isCurrentPlayer)}
                        </div>
                    </div>
                </div>
            `;
        }
        
        playersArea.innerHTML = playersHTML;
    }

    /**
     * Render a player's queens
     * @param {Object} player - The player object
     * @returns {string} HTML string of player's queens
     */
    renderPlayerQueens(player) {
        let queensHTML = '';
        
        for (const queen of player.awakeQueens || []) {
            queensHTML += `
                <div class="card queen-card awake-queen" data-queen-id="${queen.id}">
                    <div class="card-content">
                        <div class="queen-name">${queen.name}</div>
                        <div class="queen-points">${queen.points} pts</div>
                    </div>
                </div>
            `;
        }
        
        if ((player.awakeQueens || []).length === 0) {
            queensHTML = '<div class="no-queens">No queens yet</div>';
        }
        
        return queensHTML;
    }

    /**
     * Render a player's hand
     * @param {Object} player - The player object
     * @param {boolean} isCurrentPlayer - Whether this is the current player's hand
     * @returns {string} HTML string of player's hand
     */
    renderPlayerHand(player, isCurrentPlayer) {
        let handHTML = '';
        
        if (isCurrentPlayer) {
            // Show actual cards for current player
            for (const card of player.hand || []) {
                const isSelected = this.selectedCards.includes(card.id);
                handHTML += `
                    <div class="card hand-card ${isSelected ? 'selected' : ''}" data-card-id="${card.id}" data-card-type="${card.type}">
                        <div class="card-content">
                            <div class="card-type">${this.getCardTitle(card)}</div>
                            <div class="card-value">${this.getCardValue(card)}</div>
                        </div>
                    </div>
                `;
            }
        } else {
            // Show card backs for opponents
            for (let i = 0; i < (player.hand || []).length; i++) {
                handHTML += `
                    <div class="card card-back">
                        <div class="card-content"></div>
                    </div>
                `;
            }
        }
        
        return handHTML;
    }

    /**
     * Get the title text for a card
     * @param {Object} card - The card object
     * @returns {string} Card title
     */
    getCardTitle(card) {
        switch (card.type) {
            case 'king': return 'King';
            case 'knight': return 'Knight';
            case 'dragon': return 'Dragon';
            case 'potion': return 'Potion';
            case 'jester': return 'Jester';
            case 'number': return 'Number';
            default: return card.type;
        }
    }

    /**
     * Get the value text for a card
     * @param {Object} card - The card object
     * @returns {string} Card value
     */
    getCardValue(card) {
        if (card.type === 'number') {
            return card.value;
        } else {
            return '';
        }
    }

    /**
     * Calculate a player's score based on their queens
     * @param {Object} player - The player object
     * @returns {number} Player's score
     */
    calculatePlayerScore(player) {
        let score = 0;
        for (const queen of player.awakeQueens || []) {
            score += queen.points;
        }
        return score;
    }

    /**
     * Attach event handlers to game elements
     */
    attachEventHandlers() {
        // Only attach handlers if it's the current player's turn
        if (this.currentTurn.username !== this.currentPlayer) {
            return;
        }
        
        // Add event listeners for hand cards
        const handCards = document.querySelectorAll('.my-hand .hand-card');
        handCards.forEach(card => {
            card.addEventListener('click', () => this.handleCardSelection(card));
        });
        
        // Add event listener for sleeping queens (only clickable if player has a king)
        if (this.playerHasKing()) {
            const sleepingQueens = document.querySelectorAll('.sleeping-queen');
            sleepingQueens.forEach(queen => {
                queen.addEventListener('click', () => this.handleQueenSelection(queen));
            });
        }
        
        // Add event listener for playing cards
        const playButton = document.getElementById('play-cards-btn');
        if (playButton) {
            playButton.addEventListener('click', () => this.handlePlayCards());
        }
    }

    /**
     * Handle card selection from the player's hand
     * @param {HTMLElement} cardElement - The card element that was clicked
     */
    handleCardSelection(cardElement) {
        const cardId = cardElement.dataset.cardId;
        const cardType = cardElement.dataset.cardType;
        
        // Toggle selection
        if (this.selectedCards.includes(cardId)) {
            // Deselect card
            this.selectedCards = this.selectedCards.filter(id => id !== cardId);
            cardElement.classList.remove('selected');
        } else {
            // Select card - with validation based on card type
            if (this.validateCardSelection(cardId, cardType)) {
                this.selectedCards.push(cardId);
                cardElement.classList.add('selected');
            } else {
                // Show temporary error message
                const statusElement = document.getElementById('game-status');
                const originalContent = statusElement.innerHTML;
                statusElement.innerHTML = '<div class="error-msg">This combination of cards is not allowed</div>';
                setTimeout(() => {
                    statusElement.innerHTML = originalContent;
                }, 2000);
                return;
            }
        }
        
        // Update play button state
        const playButton = document.getElementById('play-cards-btn');
        if (playButton) {
            playButton.disabled = this.selectedCards.length === 0;
        }
    }

    /**
     * Validate whether a card can be selected based on already selected cards
     * @param {string} cardId - The ID of the card being selected
     * @param {string} cardType - The type of the card being selected
     * @returns {boolean} Whether the selection is valid
     */
    validateCardSelection(cardId, cardType) {
        // If no cards selected yet, any card is valid
        if (this.selectedCards.length === 0) {
            return true;
        }
        
        // Get types of already selected cards
        const selectedTypes = this.selectedCards.map(id => {
            const card = this.findCardInPlayerHand(id);
            return card ? card.type : null;
        }).filter(type => type !== null);
        
        // Rules for card combinations:
        
        // 1. Kings can only be played alone
        if (selectedTypes.includes('king') || cardType === 'king') {
            return false;
        }
        
        // 2. Knights can only be played alone
        if (selectedTypes.includes('knight') || cardType === 'knight') {
            return false;
        }
        
        // 3. Dragons can only be played alone
        if (selectedTypes.includes('dragon') || cardType === 'dragon') {
            return false;
        }
        
        // 4. Potions can only be played alone
        if (selectedTypes.includes('potion') || cardType === 'potion') {
            return false;
        }
        
        // 5. Jesters can only be played alone
        if (selectedTypes.includes('jester') || cardType === 'jester') {
            return false;
        }
        
        // 6. Number cards can be combined if they add up to a value between 2 and 10
        if (selectedTypes.includes('number') && cardType === 'number') {
            // Find the number values
            const selectedNumbers = this.selectedCards.map(id => {
                const card = this.findCardInPlayerHand(id);
                return card && card.type === 'number' ? card.value : null;
            }).filter(value => value !== null);
            
            // Get the new number value
            const newCard = this.findCardInPlayerHand(cardId);
            if (!newCard) return false;
            
            const newValue = newCard.value;
            const sum = selectedNumbers.reduce((acc, val) => acc + val, 0) + newValue;
            
            // Check if sum is within valid range
            return sum <= 10;
        }
        
        return false;
    }

    /**
     * Find a card in the current player's hand by its ID
     * @param {string} cardId - The ID of the card to find
     * @returns {Object|null} The card object or null if not found
     */
    findCardInPlayerHand(cardId) {
        const currentPlayerObj = this.players.find(p => p.username === this.currentPlayer);
        if (!currentPlayerObj || !currentPlayerObj.hand) {
            return null;
        }
        
        return currentPlayerObj.hand.find(card => card.id === cardId) || null;
    }

    /**
     * Check if the current player has a king card in their hand
     * @returns {boolean} Whether the player has a king
     */
    playerHasKing() {
        const currentPlayerObj = this.players.find(p => p.username === this.currentPlayer);
        if (!currentPlayerObj || !currentPlayerObj.hand) {
            return false;
        }
        
        return currentPlayerObj.hand.some(card => card.type === 'king');
    }

    /**
     * Handle the selection of a sleeping queen
     * @param {HTMLElement} queenElement - The queen element that was clicked
     */
    handleQueenSelection(queenElement) {
        const queenId = queenElement.dataset.queenId;
        
        // Check if a king is selected
        if (this.selectedCards.length !== 1) {
            return;
        }
        
        const selectedCardId = this.selectedCards[0];
        const selectedCard = this.findCardInPlayerHand(selectedCardId);
        
        if (selectedCard && selectedCard.type === 'king') {
            // Try to wake the queen
            this.playKingOnQueen(selectedCardId, queenId);
        }
    }

    /**
     * Play a king card on a sleeping queen
     * @param {string} kingId - The ID of the king card
     * @param {string} queenId - The ID of the queen to wake
     */
    async playKingOnQueen(kingId, queenId) {
        try {
            const response = await fetch(`${this.apiUrl}/games/${this.gameId}/play`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    action: 'wakeQueen',
                    kingId,
                    queenId
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to play king card');
            }
            
            // Update game state
            await this.fetchGameState();
            this.renderGameUI();
            
            // Clear selected cards
            this.selectedCards = [];
        } catch (error) {
            console.error('Error playing king card:', error);
            
            // Show error message
            const statusElement = document.getElementById('game-status');
            statusElement.innerHTML = '<div class="error-msg">Failed to play card. Please try again.</div>';
            setTimeout(() => {
                this.renderGameUI();
            }, 2000);
        }
    }

    /**
     * Handle playing the selected cards
     */
    async handlePlayCards() {
        if (this.selectedCards.length === 0) {
            return;
        }
        
        try {
            // Get the type of the first selected card to determine the action
            const firstCard = this.findCardInPlayerHand(this.selectedCards[0]);
            if (!firstCard) {
                throw new Error('Card not found');
            }
            
            let action;
            let additionalData = {};
            
            switch (firstCard.type) {
                case 'number':
                    action = 'playNumberCards';
                    break;
                case 'knight':
                    // Knight requires a target queen
                    // This would need UI for selecting the target
                    action = 'playKnight';
                    // For now, we'll just show a message
                    alert('Select an opponent\'s queen to steal after playing the knight');
                    return;
                case 'dragon':
                    action = 'playDragon';
                    break;
                case 'potion':
                    // Potion requires a target player
                    action = 'playPotion';
                    // For now, we'll just show a message
                    alert('Select an opponent to make discard');
                    return;
                case 'jester':
                    action = 'playJester';
                    break;
                default:
                    throw new Error('Invalid card type');
            }
            
            const response = await fetch(`${this.apiUrl}/games/${this.gameId}/play`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    action,
                    cardIds: this.selectedCards,
                    ...additionalData
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to play cards');
            }
            
            // Update game state
            await this.fetchGameState();
            this.renderGameUI();
            
            // Clear selected cards
            this.selectedCards = [];
        } catch (error) {
            console.error('Error playing cards:', error);
            
            // Show error message
            const statusElement = document.getElementById('game-status');
            statusElement.innerHTML = '<div class="error-msg">Failed to play cards. Please try again.</div>';
            setTimeout(() => {
                this.renderGameUI();
            }, 2000);
        }
    }

    /**
     * Clean up the game when leaving
     */
    cleanup() {
        this.stopPolling();
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
        }
    }
}

// CSS Styles for the game
const injectGameStyles = () => {
    const styleElement = document.createElement('style');
    styleElement.id = 'sleeping-queens-styles';
    styleElement.textContent = `
        .queens-game {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            color: white;
            font-family: Arial, sans-serif;
        }
        
        .game-board {
            display: flex;
            flex-direction: column;
            flex: 1;
            padding: 20px;
            gap: 20px;
        }
        
        .sleeping-queens-area {
            padding: 15px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
        }
        
        .sleeping-queens-area h3 {
            margin-top: 0;
            margin-bottom: 10px;
            text-align: center;
            color: #FFD700;
        }
        
        .queens-container {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            justify-content: center;
        }
        
        .draw-discard-pile {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin: 20px 0;
        }
        
        .pile {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }
        
        .pile-label {
            font-size: 14px;
            color: #cccccc;
        }
        
        .players-area {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
        }
        
        .player-section {
            flex: 1;
            min-width: 250px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            padding: 15px;
            border: 2px solid transparent;
        }
        
        .player-section.current-player {
            border-color: #4CAF50;
        }
        
        .player-section.player-turn {
            background: rgba(76, 175, 80, 0.2);
        }
        
        .player-info {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
        }
        
        .player-name {
            font-weight: bold;
            font-size: 16px;
        }
        
        .player-score {
            color: #FFD700;
            font-weight: bold;
        }
        
        .player-queens, .player-hand {
            margin-bottom: 15px;
        }
        
        .player-queens h4, .player-hand h4 {
            margin-top: 0;
            margin-bottom: 10px;
            color: #8e9aaf;
            font-size: 14px;
        }
        
        .awake-queens-container, .hand-cards {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .card {
            width: 70px;
            height: 100px;
            border-radius: 8px;
            padding: 5px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 10px rgba(0, 0, 0, 0.3);
        }
        
        .card-back {
            background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>');
            background-repeat: no-repeat;
            background-position: center;
        }
        
        .queen-card {
            background: linear-gradient(135deg, #FF9A8B 0%, #FF6A88 100%);
            color: #fff;
        }
        
        .hand-card {
            background: linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%);
            color: #fff;
        }
        
        .hand-card.selected {
            transform: translateY(-10px);
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.3);
            border: 2px solid #FFD700;
        }
        
        .card-content {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        
        .queen-name {
            font-size: 12px;
            font-weight: bold;
            text-align: center;
        }
        
        .queen-points {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            color: #FFD700;
        }
        
        .card-type {
            font-size: 12px;
            text-align: center;
        }
        
        .card-value {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
        }
        
        .no-queens {
            font-style: italic;
            color: #8e9aaf;
            font-size: 12px;
            padding: 10px;
            text-align: center;
        }
        
        .game-controls {
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px 10px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
        }
        
        .game-status {
            font-size: 16px;
        }
        
        .your-turn {
            font-weight: bold;
            color: #4CAF50;
        }
        
        .waiting-turn {
            color: #FFA500;
        }
        
        .error-msg {
            color: #ff4444;
            font-weight: bold;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
        }
        
        .play-button {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            background: #4CAF50;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        
        .play-button:hover:not(:disabled) {
            background: #45a049;
        }
        
        .play-button:disabled {
            background: #cccccc;
            cursor: not-allowed;
        }
        
        .loading-game {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            font-size: 24px;
            color: white;
        }
        
        .game-error {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            font-size: 20px;
            color: #ff4444;
        }
    `;
    
    document.head.appendChild(styleElement);
};

// Initialize the game when available
const initSleepingQueensGame = (gameId, currentPlayer, apiUrl, container) => {
    // Inject game styles
    if (!document.getElementById('sleeping-queens-styles')) {
        injectGameStyles();
    }
    
    // Create and initialize the game
    const game = new SleepingQueensGame(gameId, currentPlayer, apiUrl);
    game.init(container);
    
    return game;
};

// Export the game initializer
window.SleepingQueensGame = {
    init: initSleepingQueensGame
};
