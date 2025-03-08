const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    spectators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    status: {
        type: String,
        enum: ['waiting', 'in_progress', 'completed'],
        default: 'waiting'
    },
    maxPlayers: {
        type: Number,
        default: 2,
        min: 2,
        max: 4
    },
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        text: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
gameSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static methods for stats and filtering
gameSchema.statics.getGameStats = async function() {
    return this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgPlayers: { $avg: { $size: '$players' } }
            }
        }
    ]);
};

gameSchema.statics.getPopularTimes = async function() {
    return this.aggregate([
        {
            $group: {
                _id: { 
                    hour: { $hour: '$createdAt' },
                    status: '$status'
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.hour': 1 } }
    ]);
};

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;
