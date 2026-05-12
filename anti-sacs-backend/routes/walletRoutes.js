const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PointEvent = require('../models/PointEvent');

// GET /api/wallet/:email
router.get('/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ balance: user.points || 0, lifetime: user.lifetimePoints || 0 });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/wallet/:email/ensure
router.post('/:email/ensure', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ balance: user.points || 0, lifetime: user.lifetimePoints || 0 });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/wallet/:email/add
router.post('/:email/add', async (req, res) => {
    try {
        const { amount, reason } = req.body;
        const user = await User.findOneAndUpdate(
            { email: req.params.email },
            { $inc: { points: amount, lifetimePoints: amount } },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        await new PointEvent({
            email: req.params.email,
            amount,
            reason,
            at: Date.now()
        }).save();

        res.json({ balance: user.points, lifetime: user.lifetimePoints });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/wallet/:email/deduct
router.post('/:email/deduct', async (req, res) => {
    try {
        const { amount, reason } = req.body;
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.points < amount) {
            return res.status(400).json({ message: 'Insufficient points' });
        }

        user.points -= amount;
        await user.save();

        await new PointEvent({
            email: req.params.email,
            amount: -amount,
            reason,
            at: Date.now()
        }).save();

        res.json({ balance: user.points, lifetime: user.lifetimePoints });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/wallet/:email/events
router.get('/:email/events', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 0;
        let query = PointEvent.find({ email: req.params.email }).sort({ at: -1 });
        if (limit > 0) query = query.limit(limit);
        const events = await query;
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
