const mongoose = require('mongoose');

const pointEventSchema = new mongoose.Schema({
    email: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    at: { type: Number, default: Date.now }
});

module.exports = mongoose.model('PointEvent', pointEventSchema);
