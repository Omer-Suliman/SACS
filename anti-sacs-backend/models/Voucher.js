const mongoose = require('mongoose');

// Helper to generate short, readable voucher codes like "VX-4F7C"
function generateCode() {
    return 'VX-' + Math.random().toString(16).slice(2, 6).toUpperCase();
}

const voucherSchema = new mongoose.Schema({
    // Unique redemption code shown to the student
    code: {
        type: String,
        required: true,
        unique: true,
        default: generateCode
    },
    // Which student owns this voucher
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Which reward was claimed to produce this voucher
    rewardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reward',
        required: true
    },
    // ACTIVE = not yet used at partner. REDEEMED = already scanned.
    status: {
        type: String,
        enum: ['ACTIVE', 'REDEEMED'],
        default: 'ACTIVE'
    },
    // When the voucher expires (optional, set at claim time)
    expiresAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Voucher', voucherSchema);
