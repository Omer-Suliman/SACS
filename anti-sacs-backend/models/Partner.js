const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Partner', partnerSchema);
