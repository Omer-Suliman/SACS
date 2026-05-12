const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    type: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startAt: {
        type: Number, // Unix timestamp
        required: true
    },
    endAt: {
        type: Number, // Unix timestamp
        required: true
    },
    location: {
        type: String,
        required: true
    },
    capacity: {
        type: Number,
        required: true
    },
    points: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['PUBLISHED', 'DRAFT', 'CANCELLED'],
        default: 'PUBLISHED'
    },

    // Students who have registered for this activity.
    // $addToSet prevents duplicates at the DB layer — same pattern as Slot.bookedBy[].
    registeredBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Students who actually attended and received points
    attendedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
