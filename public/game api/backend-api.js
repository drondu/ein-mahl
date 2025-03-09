/**
 * Sleeping Queens Backend API Routes
 * This file contains the backend routes needed for the Sleeping Queens game
 * 
 * Implementation Note: Include this in your server implementation
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate'); // Your authentication middleware

// Game state model
const Game = require('../models/Game'); // Your Game model
const User = require('../models/User'); // Your User model

/**
 * Get game state
 * GET /api/games/:id/state
 */
router.get('/games/:id/state', authenticate, async (req, res) => {
    try {
        const gameId = req.params.id;
        const game = await Game.findById(gameId)
            .populate('players')
            .populate('spectators')
            .populate('creator');
        
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        // Check if user is a player or spectator
        const userId = req.user.id;
        const isPlayer = game.players.some(player => player._id.toString() === userId);
        const isSpectator = game.spectators.some(spec => spec._id.toString() === userId);
        
        if (!isPlayer && !isSpectator) {
            return res.status(403).json({ message: 'You are not authorized to view this game' });
        }
        
        // If game is not in progress, return basic info
        if (game.status !== 'in_progress') {
            return res.status(200).json({
                _id: game._id,
                name: game.name,
                status: game.status,
                players: game.players.map(p => ({
                    _id: p._id,
                    username: p.username,
                    avatar: p.avatar
                })),
                spectators: game.spectators.map(s => ({
                    _id: s._id,
                    username: s.username,
                    avatar: s.avatar
                })),
                creator: {
                    _id: game.creator._id,
                    username: game.creator.username
                },
                maxPlayers: game.maxPlayers
            });
        }
        
        // If game is in progress, return full game state
        // Get game state from the database (or wherever it's stored)
        const gameState = game.gameState || initializeGameState(game);
        
        // If game state doesn't exist, initialize it
        if (!gameState && game.status === 'in_progress') {
            const newGameState = initializeGameState(game);
            
            // Save the initialized game state
            game.gameState = newGameState;
            await game.save();
            
            return res.status(200).json(newGameState);
        }
        
        // Return the game state
        return res.status(200).json(gameState);
    } catch (error) {
        console.error('Error fetching game state:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * Initialize a new game state
 * @param {Object} game - The game document
 * @returns {Object} The initialized game state
 */
function initializeGameState(game) {
    // Create queen cards
    const queens = [
        { id: 'q1', name: 'Rose Queen', points: 5 },
        { id: 'q2', name: 'Cake Queen', points: 5 },
        { id: 'q3', name: 'Heart Queen', points: 5 },
        { id: 'q4', name: 'Star Queen', points: 5 },
        { id: 'q5', name: 'Moon Queen', points: 10 },
        { id: 'q6', name: 'Ladybug Queen', points: 10 },
        { id: 'q7', name: 'Sunflower Queen', points: 10 },
        { id: 'q8', name: 'Rainbow Queen', points: 10 },
        { id: 'q9', name: 'Dragon Queen', points: 15 },
        { id: 'q10', name: 'Cat Queen', points: 15 },
        { id: 'q11', name: 'Dog Queen', points: 15 },
        { id: 'q12', name: 'Pancake Queen', points: 15 }
    ];
    
    // Create playing cards
    const createDeck = () => {
        const deck = [];
        
        // Add number cards (1-10)
        for (let i = 1; i <= 10; i++) {
            // 4 of each number
            for (let j = 0; j < 4; j++) {
                deck.push({
                    id: `n${i}_${j}`,
                    type: 'number',
                    value: i
                });
            }
        }
        
        // Add kings (8)
        for (let i = 0; i < 8; i++) {
            deck.push({
                id: `king_${i}`,
                type: 'king'
            });
        }
        
        // Add knights (4)
        for (let i = 0; i < 4; i++) {
            deck.push({
                id: `knight_${i}`,
                type: 'knight'
            });
        }
        
        // Add dragons (3)
        for (let i = 0; i < 3; i++) {
            deck.push({
                id: `dragon_${i}`,
                type: 'dragon'
            });
        }
        
        // Add potions (4)
        for (let i = 0; i < 4; i++) {
            deck.push({
                id: `potion_${i}`,
                type: 'potion'
            });
        }
        
        // Add jesters (3)
        for (let i = 0; i < 3; i++) {
            deck.push({
                id: `jester_${i}`,
                type: 'jester'
            });
        }
        
        // Shuffle the deck
        return shuffleDeck(deck);
    };
    
    // Shuffle function
    const shuffleDeck = (deck) => {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    };
    
    // Create the deck
    const deck = createDeck();
    
    // Deal cards to players
    const players = game.players.map(player => {
        const hand = [];
        for (let i = 0; i < 5; i++) {
            hand.push(deck.pop());
        }
        
        return {
            _id: player._id,
            username: player.username,
            hand: hand,
            awakeQueens: []
        };
    });
    
    // Determine first player randomly
    const firstPlayerIndex = Math.floor(Math.random() * players.length);
    
    // Initialize game state
    return {
        _id: game._id,
        name: game.name,
        status: 'in_progress',
        players: players,
        spectators: game.spectators.map(s => ({
            _id: s._id,
            username: s.username,
            avatar: s.avatar
        })),
        creator: {
            _id: game.creator._id,
            username: game.creator.username
        },
        maxPlayers: game.maxPlayers,
        sleepingQueens: queens,
        drawPile: deck,
        discardPile: [],
        currentTurn: players[firstPlayerIndex],
        turnOrder: players.map(p => p.username),
        lastAction: null,
        gameOver: false,
        winner: null
    };
}

/**
 * Play a move
 * POST /api/games/:id/play
 */
router.post('/games/:id/play', authenticate, async (req, res) => {
    try {
        const gameId = req.params.id;
        const userId = req.user.id;
        const { action, cardIds, kingId, queenId, targetPlayerId, targetQueenId } = req.body;
        
        // Get the game
        const game = await Game.findById(gameId);
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }
        
        // Check if game is in progress
        if (game.status !== 'in_progress') {
            return res.status(400).json({ message: 'Game is not in progress' });
        }
        
        // Get the game state
        const gameState = game.gameState;
        if (!gameState) {
            return res.status(400).json({ message: 'Game state not found' });
        }
        
        // Check if it's the player's turn
        const currentPlayer = gameState.players.find(p => p._id.toString() === userId);
        if (!currentPlayer) {
            return res.status(403).json({ message: 'You are not a player in this game' });
        }
        
        if (gameState.currentTurn._id.toString() !== userId) {
            return res.status(400).json({ message: 'It\'s not your turn' });
        }
        
        // Process the move based on the action
        let updatedGameState;
        
        switch (action) {
            case 'wakeQueen':
                // Wake a queen with a king card
                updatedGameState = handleWakeQueen(gameState, userId, kingId, queenId);
                break;
                
            case 'playKnight':
                // Play a knight to steal a queen
                updatedGameState = handlePlayKnight(gameState, userId, cardIds[0], targetPlayerId, targetQueenId);
                break;
                
            case 'playDragon':
                // Play a dragon to defend against a knight
                updatedGameState = handlePlayDragon(gameState, userId, cardIds[0]);
                break;
                
            case 'playPotion':
                // Play a potion to make a player discard a queen
                updatedGameState = handlePlayPotion(gameState, userId, cardIds[0], targetPlayerId);
                break;
                
            case 'playJester':
                // Play a jester to randomly get a queen
                updatedGameState = handlePlayJester(gameState, userId, cardIds[0]);
                break;
                
            case 'playNumberCards':
                // Play number cards (sum or equation)
                updatedGameState = handlePlayNumberCards(gameState, userId, cardIds);
                break;
                
            default:
                return res.status(400).json({ message: 'Invalid action' });
        }
        
        // Save the updated game state
        game.gameState = updatedGameState;
        await game.save();
        
        // Check if the game is over
        if (updatedGameState.gameOver) {
            // Update the game status
            game.status = 'completed';
            await game.save();
            
            // Update user stats
            if (updatedGameState.winner) {
                const winner = await User.findById(updatedGameState.winner._id);
                if (winner) {
                    winner.gamesWon += 1;
                    await winner.save();
                }
            }
            
            // Update games played for all players
            for (const player of game.players) {
                const user = await User.findById(player);
                if (user) {
                    user.gamesPlayed += 1;
                    await user.save();
                }
            }
        }
        
        // Return the updated game state
        return res.status(200).json(updatedGameState);
    } catch (error) {
        console.error('Error processing move:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * Handle waking a queen with a king card
 */
function handleWakeQueen(gameState, playerId, kingId, queenId) {
    // Create a copy of the game state
    const newState = JSON.parse(JSON.stringify(gameState));
    
    // Find the player
    const playerIndex = newState.players.findIndex(p => p._id.toString() === playerId);
    const player = newState.players[playerIndex];
    
    // Find the king card in the player's hand
    const kingIndex = player.hand.findIndex(card => card.id === kingId && card.type === 'king');
    if (kingIndex === -1) {
        throw new Error('King card not found in player\'s hand');
    }
    
    // Find the queen in the sleeping queens
    const queenIndex = newState.sleepingQueens.findIndex(queen => queen.id === queenId);
    if (queenIndex === -1) {
        throw new Error('Queen not found in sleeping queens');
    }
    
    // Remove the king from the player's hand
    const kingCard = player.hand.splice(kingIndex, 1)[0];
    
    // Add the king to the discard pile
    newState.discardPile.push(kingCard);
    
    // Remove the queen from sleeping queens
    const queen = newState.sleepingQueens.splice(queenIndex, 1)[0];
    
    // Add the queen to the player's awake queens
    player.awakeQueens.push(queen);
    
    // Draw a new card from the draw pile
    if (newState.drawPile.length > 0) {
        player.hand.push(newState.drawPile.pop());
    }
    
    // Record the action
    newState.lastAction = {
        type: 'wakeQueen',
        player: player.username,
        queen: queen.name
    };
    
    // Check if the game is over
    checkGameOver(newState);
    
    // Move to the next player's turn
    advanceTurn(newState);
    
    return newState;
}

/**
 * Handle playing a knight card to steal a queen
 */
function handlePlayKnight(gameState, playerId, knightId, targetPlayerId, targetQueenId) {
    // Create a copy of the game state
    const newState = JSON.parse(JSON.stringify(gameState));
    
    // Find the player
    const playerIndex = newState.players.findIndex(p => p._id.toString() === playerId);
    const player = newState.players[playerIndex];
    
    // Find the target player
    const targetPlayerIndex = newState.players.findIndex(p => p._id.toString() === targetPlayerId);
    if (targetPlayerIndex === -1) {
        throw new Error('Target player not found');
    }
    const targetPlayer = newState.players[targetPlayerIndex];
    
    // Find the knight card in the player's hand
    const knightIndex = player.hand.findIndex(card => card.id === knightId && card.type === 'knight');
    if (knightIndex === -1) {
        throw new Error('Knight card not found in player\'s hand');
    }
    
    // Find the queen in the target player's awake queens
    const targetQueenIndex = targetPlayer.awakeQueens.findIndex(queen => queen.id === targetQueenId);
    if (targetQueenIndex === -1) {
        throw new Error('Target queen not found in target player\'s awake queens');
    }
    
    // Check if the target player has a dragon card
    const hasDragon = targetPlayer.hand.some(card => card.type === 'dragon');
    
    if (hasDragon) {
        // The knight's action is recorded, but the target player will need to decide whether to use a dragon
        newState.pendingAction = {
            type: 'knightAttack',
            attackingPlayer: playerId,
            targetPlayer: targetPlayerId,
            knightId,
            targetQueenId
        };
        
        // Record the action
        newState.lastAction = {
            type: 'knightAttack',
            player: player.username,
            targetPlayer: targetPlayer.username
        };
        
        return newState;
    }
    
    // Remove the knight from the player's hand
    const knightCard = player.hand.splice(knightIndex, 1)[0];
    
    // Add the knight to the discard pile
    newState.discardPile.push(knightCard);
    
    // Remove the queen from target player's awake queens
    const queen = targetPlayer.awakeQueens.splice(targetQueenIndex, 1)[0];
    
    // Add the queen to the player's awake queens
    player.awakeQueens.push(queen);
    
    // Draw a new card from the draw pile
    if (newState.drawPile.length > 0) {
        player.hand.push(newState.drawPile.pop());
    }
    
    // Record the action
    newState.lastAction = {
        type: 'stealQueen',
        player: player.username,
        targetPlayer: targetPlayer.username,
        queen: queen.name
    };
    
    // Check if the game is over
    checkGameOver(newState);
    
    // Move to the next player's turn
    advanceTurn(newState);
    
    return newState;
}

/**
 * Handle playing a dragon card to defend against a knight
 */
function handlePlayDragon(gameState, playerId, dragonId) {
    // Create a copy of the game state
    const newState = JSON.parse(JSON.stringify(gameState));
    
    // Check if there's a pending knight attack
    if (!newState.pendingAction || newState.pendingAction.type !== 'knightAttack' || newState.pendingAction.targetPlayer !== playerId) {
        throw new Error('No pending knight attack to defend against');
    }
    
    // Find the player
    const playerIndex = newState.players.findIndex(p => p._id.toString() === playerId);
    const player = newState.players[playerIndex];
    
    // Find the attacking player
    const attackingPlayerIndex = newState.players.findIndex(p => p._id.toString() === newState.pendingAction.attackingPlayer);
    const attackingPlayer = newState.players[attackingPlayerIndex];
    
    // Find the dragon card in the player's hand
    const dragonIndex = player.hand.findIndex(card => card.id === dragonId && card.type === 'dragon');
    if (dragonIndex === -1) {
        throw new Error('Dragon card not found in player\'s hand');
    }
    
    // Find the knight card in the attacking player's hand
    const knightIndex = attackingPlayer.hand.findIndex(card => card.id === newState.pendingAction.knightId && card.type === 'knight');
    if (knightIndex === -1) {
        throw new Error('Knight card not found in attacking player\'s hand');
    }
    
    // Remove the dragon from the player's hand
    const dragonCard = player.hand.splice(dragonIndex, 1)[0];
    
    // Remove the knight from the attacking player's hand
    const knightCard = attackingPlayer.hand.splice(knightIndex, 1)[0];
    
    // Add both cards to the discard pile
    newState.discardPile.push(dragonCard, knightCard);
    
    // Draw new cards for both players
    if (newState.drawPile.length > 0) {
        player.hand.push(newState.drawPile.pop());
    }
    
    if (newState.drawPile.length > 0) {
        attackingPlayer.hand.push(newState.drawPile.pop());
    }
    
    // Clear the pending action
    delete newState.pendingAction;
    
    // Record the action
    newState.lastAction = {
        type: 'defendWithDragon',
        player: player.username,
        attackingPlayer: attackingPlayer.username
    };
    
    // Move to the next player's turn (the defending player)
    newState.currentTurn = player;
    
    return newState;
}

/**
 * Handle playing a potion card
 */
function handlePlayPotion(gameState, playerId, potionId, targetPlayerId) {
    // Create a copy of the game state
    const newState = JSON.parse(JSON.stringify(gameState));
    
    // Find the player
    const playerIndex = newState.players.findIndex(p => p._id.toString() === playerId);
    const player = newState.players[playerIndex];
    
    // Find the target player
    const targetPlayerIndex = newState.players.findIndex(p => p._id.toString() === targetPlayerId);
    if (targetPlayerIndex === -1) {
        throw new Error('Target player not found');
    }
    const targetPlayer = newState.players[targetPlayerIndex];
    
    // Find the potion card in the player's hand
    const potionIndex = player.hand.findIndex(card => card.id === potionId && card.type === 'potion');
    if (potionIndex === -1) {
        throw new Error('Potion card not found in player\'s hand');
    }
    
    // Check if target player has any awake queens
    if (targetPlayer.awakeQueens.length === 0) {
        throw new Error('Target player has no queens to discard');
    }
    
    // Remove the potion from the player's hand
    const potionCard = player.hand.splice(potionIndex, 1)[0];
    
    // Add the potion to the discard pile
    newState.discardPile.push(potionCard);
    
    // Choose a random queen from the target player's awake queens
    const randomIndex = Math.floor(Math.random() * targetPlayer.awakeQueens.length);
    const queen = targetPlayer.awakeQueens.splice(randomIndex, 1)[0];
    
    // Put the queen back to sleep
    newState.sleepingQueens.push(queen);
    
    // Draw a new card from the draw pile
    if (newState.drawPile.length > 0) {
        player.hand.push(newState.drawPile.pop());
    }
    
    // Record the action
    newState.lastAction = {
        type: 'playPotion',
        player: player.username,
        targetPlayer: targetPlayer.username,
        queen: queen.name
    };
    
    // Check if the game is over
    checkGameOver(newState);
    
    // Move to the next player's turn
    advanceTurn(newState);
    
    return newState;
}

/**
 * Handle playing a jester card
 */
function handlePlayJester(gameState, playerId, jesterId) {
    // Create a copy of the game state
    const newState = JSON.parse(JSON.stringify(gameState));
    
    // Find the player
    const playerIndex = newState.players.findIndex(p => p._id.toString() === playerId);
    const player = newState.players[playerIndex];
    
    // Find the jester card in the player's hand
    const jesterIndex = player.hand.findIndex(card => card.id === jesterId && card.type === 'jester');
    if (jesterIndex === -1) {
        throw new Error('Jester card not found in player\'s hand');
    }
    
    // Remove the jester from the player's hand
    const jesterCard = player.hand.splice(jesterIndex, 1)[0];
    
    // Add the jester to the discard pile
    newState.discardPile.push(jesterCard);
    
    // 50% chance to wake a queen
    const wakeQueen = Math.random() >= 0.5;
    
    if (wakeQueen && newState.sleepingQueens.length > 0) {
        // Choose a random queen from the sleeping queens
        const randomIndex = Math.floor(Math.random() * newState.sleepingQueens.length);
        const queen = newState.sleepingQueens.splice(randomIndex, 1)[0];
        
        // Add the queen to the player's awake queens
        player.awakeQueens.push(queen);
        
        // Record the action
        newState.lastAction = {
            type: 'jesterSuccess',
            player: player.username,
            queen: queen.name
        };
    } else {
        // Record the action
        newState.lastAction = {
            type: 'jesterFail',
            player: player.username
        };
    }
    
    // Draw a new card from the draw pile
    if (newState.drawPile.length > 0) {
        player.hand.push(newState.drawPile.pop());
    }
    
    // Check if the game is over
    checkGameOver(newState);
    
    // Move to the next player's turn
    advanceTurn(newState);
    
    return newState;
}

/**
 * Handle playing number cards
 */
function handlePlayNumberCards(gameState, playerId, cardIds) {
    // Create a copy of the game state
    const newState = JSON.parse(JSON.stringify(gameState));
    
    // Find the player
    const playerIndex = newState.players.findIndex(p => p._id.toString() === playerId);
    const player = newState.players[playerIndex];
    
    // Find all the number cards in the player's hand
    const cards = [];
    for (const cardId of cardIds) {
        const cardIndex = player.hand.findIndex(card => card.id === cardId && card.type === 'number');
        if (cardIndex === -1) {
            throw new Error('Number card not found in player\'s hand');
        }
        cards.push({
            card: player.hand[cardIndex],
            index: cardIndex
        });
    }
    
    // Check if the cards form a valid combination
    const values = cards.map(c => c.card.value);
    const sum = values.reduce((acc, val) => acc + val, 0);
    
    if (sum < 2 || sum > 10) {
        throw new Error('Invalid number card combination');
    }
    
    // Remove the cards from the player's hand (start from highest index to avoid shifting issues)
    cards.sort((a, b) => b.index - a.index);
    const discardedCards = [];
    for (const card of cards) {
        discardedCards.push(player.hand.splice(card.index, 1)[0]);
    }
    
    // Add the cards to the discard pile
    newState.discardPile.push(...discardedCards);
    
    // Draw new cards
    for (let i = 0; i < discardedCards.length; i++) {
        if (newState.drawPile.length > 0) {
            player.hand.push(newState.drawPile.pop());
        }
    }
    
    // Record the action
    newState.lastAction = {
        type: 'playNumberCards',
        player: player.username,
        values,
        sum
    };
    
    // Move to the next player's turn
    advanceTurn(newState);
    
    return newState;
}

/**
 * Check if the game is over
 */
function checkGameOver(gameState) {
    // Game is over if all queens are awake
    if (gameState.sleepingQueens.length === 0) {
        gameState.gameOver = true;
        
        // Find the player with the most points
        let maxPoints = 0;
        let winner = null;
        
        for (const player of gameState.players) {
            const points = player.awakeQueens.reduce((acc, queen) => acc + queen.points, 0);
            if (points > maxPoints) {
                maxPoints = points;
                winner = player;
            }
        }
        
        gameState.winner = winner;
        return true;
    }
    
    // Game is over if any player has a certain number of queens based on player count
    const requiredQueens = gameState.players.length <= 3 ? 5 : 4;
    
    for (const player of gameState.players) {
        if (player.awakeQueens.length >= requiredQueens) {
            gameState.gameOver = true;
            gameState.winner = player;
            return true;
        }
    }
    
    // Game is over if any player has queens worth a certain number of points
    const requiredPoints = 40;
    
    for (const player of gameState.players) {
        const points = player.awakeQueens.reduce((acc, queen) => acc + queen.points, 0);
        if (points >= requiredPoints) {
            gameState.gameOver = true;
            gameState.winner = player;
            return true;
        }
    }
    
    return false;
}

/**
 * Advance to the next player's turn
 */
function advanceTurn(gameState) {
    const currentPlayerIndex = gameState.turnOrder.indexOf(gameState.currentTurn.username);
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.turnOrder.length;
    const nextPlayerUsername = gameState.turnOrder[nextPlayerIndex];
    
    gameState.currentTurn = gameState.players.find(p => p.username === nextPlayerUsername);
}

module.exports = router;
