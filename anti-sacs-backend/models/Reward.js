const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['PERCENT', 'AMOUNT', 'ITEM'],
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },
    minSpend: {
        type: Number,
        default: 0,
        min: 0
    },
    validDays: {
        type: Number,
        default: 30,
        min: 1
    },
    role: {
        type: String,
        default: 'ADMIN'
    },
    // Human-readable partner name (e.g. "Cafeteria", "Campus Shop")
    partnerName: {
        type: String,
        default: ''
    },
    // Points required to claim this reward
    costPoints: {
        type: Number,
        required: true,
        min: 1
    },
    // How many vouchers can still be issued — 0 means out of stock
    stock: {
        type: Number,
        required: true,
        default: 10,
        min: 0
    },
    // Optional product/banner image
    imageUrl: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE'
    }
}, { timestamps: true });

module.exports = mongoose.model('Reward', rewardSchema);
