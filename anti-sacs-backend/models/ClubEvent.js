const mongoose = require('mongoose');

const clubEventSchema = new mongoose.Schema({
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    startAt: { type: Date, required: true },
    location: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ClubEvent', clubEventSchema);
