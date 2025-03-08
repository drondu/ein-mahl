const express = require('express');
const router = express.Router();
const User = require('../models/User');
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
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Get user profile
router.get('/', authenticateUser, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
});

// Update user profile
router.put('/', authenticateUser, async (req, res) => {
    try {
        const { bio } = req.body;
        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.bio = bio;
        await user.save();

        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
});

// Update avatar
router.post('/avatar', authenticateUser, async (req, res) => {
    try {
        const { avatar } = req.body;
        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate base64 image
        if (!avatar.startsWith('data:image/')) {
            return res.status(400).json({ message: 'Invalid image format' });
        }

        // Check file size (limit to 2MB)
        const base64Size = Buffer.from(avatar.split(',')[1], 'base64').length;
        if (base64Size > 2 * 1024 * 1024) {
            return res.status(400).json({ message: 'Image too large (max 2MB)' });
        }

        user.avatar = avatar;
        await user.save();

        res.json({ 
            message: 'Avatar updated successfully',
            avatar: user.avatar
        });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading avatar', error: error.message });
    }
});

// Get user stats
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('stats');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user.stats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
});

module.exports = router;
