const express = require('express');
const router = express.Router();
const PartnerRedemption = require('../models/PartnerRedemption');

router.get('/', async (req, res) => {
    try {
        const ts = req.query.since ? new Date(parseInt(req.query.since)) : new Date(0);
        const redemptions = await PartnerRedemption.find({ redeemedAt: { $gte: ts } }).sort({ redeemedAt: -1 });
        res.json(redemptions);
    } catch (err) {
        res.status(500).json({ message: 'Server error fetching redemptions.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const newRedemption = new PartnerRedemption(req.body);
        const saved = await newRedemption.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ message: 'Server error saving redemption.' });
    }
});

module.exports = router;
