const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
    // Basic info
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        enum: ['ACADEMIC', 'SPORT', 'CULTURE', 'TECH', 'SOCIAL', 'OTHER'],
        default: 'OTHER'
    },

    // Meeting logistics (kept compatible with existing frontend fields)
    location: {
        type: String,
        default: ''
    },
    meetingDays: {
        type: String,
        default: ''
    },
    meetingTime: {
        type: String,
        default: ''
    },

    // Approval workflow
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },

    // The founding student / president — stored as an ObjectId ref to User
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Legacy string field used by older frontend code
    createdBy: {
        type: String,
        default: ''
    },

    // Embedded members array — each entry is an ObjectId pointing to a User.
    // $addToSet on this array prevents duplicate ObjectIds at the DB layer.
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ]

}, { timestamps: true });

module.exports = mongoose.model('Club', clubSchema);
