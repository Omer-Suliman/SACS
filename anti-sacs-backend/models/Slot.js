const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
    createdByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdByName: {
        type: String,
        required: true
    },
    date: {
        type: String, // format YYYY-MM-DD
        required: true
    },
    startTime: {
        type: String, // format HH:MM
        required: true
    },
    endTime: {
        type: String, // format HH:MM
        required: true
    },
    capacity: {
        type: Number,
        required: true,
        default: 1
    },
    booked: {
        type: Number,
        default: 0
    },
    // Array of student ObjectIds who have booked this slot
    // Used by GET /api/slots/booked/:studentId to replace the phantom /appointments route
    bookedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    office: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Slot', slotSchema);
