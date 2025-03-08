const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Game = require('../models/Game');

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token or unauthorized', error: error.message });
    }
};

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

// Update user
router.put('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { username, isAdmin } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (username) user.username = username;
        if (typeof isAdmin === 'boolean') user.isAdmin = isAdmin;

        await user.save();
        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
});

// Delete all users except current admin
router.delete('/users/delete-all', async (req, res) => {
    try {
        // Delete all users except the current admin
        const result = await User.deleteMany({
            _id: { $ne: req.user._id }, // exclude current admin
            isAdmin: false // extra safety to not delete other admins
        });

        // Update games to remove deleted players
        await Game.updateMany(
            {},
            { $pull: { players: { $ne: req.user._id } } }
        );

        res.json({ 
            message: 'All users deleted successfully', 
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting users', error: error.message });
    }
});

// Delete single user
router.delete('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Prevent self-deletion
        if (userId === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot delete your own admin account' });
        }

        const result = await User.findByIdAndDelete(userId);
        if (!result) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Also delete or update related game records
        await Game.updateMany(
            { players: userId },
            { $pull: { players: userId } }
        );

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
});

// Get all games
router.get('/games', async (req, res) => {
    try {
        const games = await Game.find().populate('players', 'username');
        res.json(games);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching games', error: error.message });
    }
});

// Delete game
router.delete('/games/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const result = await Game.findByIdAndDelete(gameId);
        
        if (!result) {
            return res.status(404).json({ message: 'Game not found' });
        }

        res.json({ message: 'Game deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting game', error: error.message });
    }
});

// Get system statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await Promise.all([
            User.countDocuments(),
            Game.countDocuments(),
            User.countDocuments({ isAdmin: true }),
            Game.countDocuments({ status: 'completed' })
        ]);

        res.json({
            totalUsers: stats[0],
            totalGames: stats[1],
            totalAdmins: stats[2],
            completedGames: stats[3]
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
});

module.exports = router;
