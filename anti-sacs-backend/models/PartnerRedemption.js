const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema({
    voucherCode: { type: String, required: true },
    redeemedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PartnerRedemption', redemptionSchema);
