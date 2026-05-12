const express = require('express');
const router = express.Router();
const ClubEvent = require('../models/ClubEvent');

router.get('/', async (req, res) => {
    try {
        const { clubId } = req.query;
        let query = {};
        if (clubId) query.clubId = clubId;
        const events = await ClubEvent.find(query).sort({ startAt: 1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const ev = new ClubEvent(req.body);
        const saved = await ev.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const updated = await ClubEvent.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await ClubEvent.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
