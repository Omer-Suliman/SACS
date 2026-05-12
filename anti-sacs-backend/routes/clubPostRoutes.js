const express = require('express');
const router = express.Router();
const ClubPost = require('../models/ClubPost');

router.get('/', async (req, res) => {
    try {
        const { clubId } = req.query;
        let query = {};
        if (clubId) query.clubId = clubId;
        const posts = await ClubPost.find(query).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const post = new ClubPost(req.body);
        const saved = await post.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const updated = await ClubPost.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await ClubPost.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
