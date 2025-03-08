const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    avatar: {
        type: String,
        default: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSI3MCIgcj0iNDAiIGZpbGw9IiM3MTgwOTYiLz48cGF0aCBkPSJNMTAwIDEyMGMtMjcuNjE0IDAtNTAgMjIuMzg2LTUwIDUwdjE1aDEwMHYtMTVjMC0yNy42MTQtMjIuMzg2LTUwLTUwLTUweiIgZmlsbD0iIzcxODA5NiIvPjwvc3ZnPg=='
    },
    bio: {
        type: String,
        default: '',
        maxlength: 500
    },
    stats: {
        gamesPlayed: {
            type: Number,
            default: 0
        },
        gamesWon: {
            type: Number,
            default: 0
        },
        winRate: {
            type: Number,
            default: 0
        },
        averageGameTime: {
            type: Number, // in minutes
            default: 0
        },
        favoriteGameMode: {
            type: String,
            default: 'classic'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Update winRate when games stats change
userSchema.pre('save', function(next) {
    if (this.stats.gamesPlayed > 0) {
        this.stats.winRate = (this.stats.gamesWon / this.stats.gamesPlayed) * 100;
    }
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Update last active timestamp
userSchema.methods.updateActivity = async function() {
    this.lastActive = Date.now();
    return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
