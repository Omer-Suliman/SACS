const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        enum: ['STUDENT', 'DOCTOR', 'STAFF', 'ADMIN', 'PARTNER'],
        default: 'STUDENT'
    },
    status: {
        type: String,
        default: 'ACTIVE'
    },
    hashedPassword: {
        type: String,
        required: true
    },
    // Student activity points balance
    points: {
        type: Number,
        default: 0,
        min: 0
    },
    lifetimePoints: {
        type: Number,
        default: 0,
        min: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
