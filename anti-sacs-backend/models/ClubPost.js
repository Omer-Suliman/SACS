const mongoose = require('mongoose');

const clubPostSchema = new mongoose.Schema({
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ClubPost', clubPostSchema);
