const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const jwt = require('jsonwebtoken');

// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token', error: error.message });
    }
};

// Create a new game
router.post('/', authenticateUser, async (req, res) => {
    try {
        const { name, maxPlayers } = req.body;
        
        // First get the user ID and create game
        const game = new Game({
            name,
            creator: req.userId,
            maxPlayers: maxPlayers || 2,
            players: [req.userId] // Add creator as first player
        });

        await game.save();
        
        // Populate both creator and players fields
        await game.populate([
            { path: 'creator', select: 'username' },
            { path: 'players', select: 'username' }
        ]);

        console.log('Created game:', {
            id: game._id,
            name: game.name,
            creator: game.creator,
            players: game.players
        });

        res.status(201).json(game);
    } catch (error) {
        res.status(400).json({ message: 'Error creating game', error: error.message });
    }
});

// Get all active games
router.get('/', authenticateUser, async (req, res) => {
    try {
        const games = await Game.find({ 
            status: { $in: ['waiting', 'in_progress'] }
        })
        .populate('creator', 'username')
        .populate('players', 'username')
        .sort('-createdAt');

        res.json(games);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching games', error: error.message });
    }
});

// Delete a game
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        if (game.creator.toString() !== req.userId) {
            return res.status(403).json({ message: 'Only the creator can delete the game' });
        }

        if (game.players.length > 1) {
            return res.status(400).json({ message: 'Cannot delete game with active players' });
        }

        await Game.findByIdAndDelete(req.params.id);
        res.json({ message: 'Game deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting game', error: error.message });
    }
});

// Get game by ID
router.get('/:id', authenticateUser, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id)
            .populate([
                { path: 'creator', select: 'username' },
                { path: 'players', select: 'username' },
                { path: 'spectators', select: 'username' }
            ]);

        console.log('Found game:', {
            id: game?._id,
            name: game?.name,
            creator: game?.creator,
            players: game?.players
        });
        
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        res.json(game);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching game', error: error.message });
    }
});

// Join a game
router.post('/:id/join', authenticateUser, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        if (game.status !== 'waiting') {
            return res.status(400).json({ message: 'Game is not accepting players' });
        }

        if (game.players.includes(req.userId)) {
            return res.status(400).json({ message: 'You are already in this game' });
        }

        if (game.players.length >= game.maxPlayers) {
            return res.status(400).json({ message: 'Game is full' });
        }

        game.players.push(req.userId);
        
        if (game.players.length === game.maxPlayers) {
            game.status = 'in_progress';
        }

        await game.save();
        await game.populate([
            { path: 'creator', select: 'username' },
            { path: 'players', select: 'username' }
        ]);

        console.log('Player joined game:', {
            id: game._id,
            name: game.name,
            players: game.players
        });

        res.json(game);
    } catch (error) {
        res.status(500).json({ message: 'Error joining game', error: error.message });
    }
});

// Leave a game
router.post('/:id/leave', authenticateUser, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        if (!game.players.includes(req.userId)) {
            return res.status(400).json({ message: 'You are not in this game' });
        }

        // Remove player from the game
        game.players = game.players.filter(playerId => playerId.toString() !== req.userId);
        
        // If game is empty, delete it
        if (game.players.length === 0) {
            await Game.findByIdAndDelete(req.params.id);
            return res.json({ message: 'Game deleted as last player left' });
        }

        // If creator leaves, assign new creator
        if (game.creator.toString() === req.userId && game.players.length > 0) {
            game.creator = game.players[0];
        }

        await game.save();
        await game.populate([
            { path: 'creator', select: 'username' },
            { path: 'players', select: 'username' }
        ]);

        console.log('Player left game:', {
            id: game._id,
            name: game.name,
            remainingPlayers: game.players
        });

        res.json(game);
    } catch (error) {
        res.status(500).json({ message: 'Error leaving game', error: error.message });
    }
});

// Spectate a game
router.post('/:id/spectate', authenticateUser, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        // Check if user is already a player
        if (game.players.includes(req.userId)) {
            return res.status(400).json({ message: 'Players cannot be spectators' });
        }

        // If user is already spectating, remove them from all games they're spectating
        await Game.updateMany(
            { spectators: req.userId },
            { $pull: { spectators: req.userId } }
        );

        // Add user to spectators of the requested game
        game.spectators.push(req.userId);
        await game.save();

        await game.populate([
            { path: 'creator', select: 'username' },
            { path: 'players', select: 'username' },
            { path: 'spectators', select: 'username' }
        ]);

        console.log('New spectator joined:', {
            id: game._id,
            name: game.name,
            spectators: game.spectators
        });

        res.json(game);
    } catch (error) {
        res.status(500).json({ message: 'Error spectating game', error: error.message });
    }
});

// Leave spectating
router.post('/:id/leave-spectate', authenticateUser, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        // Remove user from spectators
        game.spectators = game.spectators.filter(spectatorId => spectatorId.toString() !== req.userId);
        await game.save();

        await game.populate([
            { path: 'creator', select: 'username' },
            { path: 'players', select: 'username' },
            { path: 'spectators', select: 'username' }
        ]);

        console.log('Spectator left:', {
            id: game._id,
            name: game.name,
            spectators: game.spectators
        });

        res.json(game);
    } catch (error) {
        res.status(500).json({ message: 'Error leaving spectate mode', error: error.message });
    }
});

module.exports = router;
