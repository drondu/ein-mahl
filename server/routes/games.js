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
        
        const game = new Game({
            name,
            creator: req.userId,
            maxPlayers: maxPlayers || 2,
            players: [req.userId]
        });

        await game.save();

        await game.populate('creator', 'username');
        await game.populate('players', 'username');

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
        await game.populate('players', 'username');

        res.json(game);
    } catch (error) {
        res.status(500).json({ message: 'Error joining game', error: error.message });
    }
});

module.exports = router;
