const express = require('express');
const router = express.Router();
const Partner = require('../models/Partner');

router.get('/', async (req, res) => {
    try {
        const partners = await Partner.find();
        res.json(partners.map(p => ({ ...p.toObject(), id: p._id.toString() })));
    } catch (err) {
        console.error('Fetch Partners Error:', err);
        res.status(500).json({ message: 'Server error fetching partners.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const newPartner = new Partner(req.body);
        const saved = await newPartner.save();
        res.status(201).json({ ...saved.toObject(), id: saved._id.toString() });
    } catch (err) {
        console.error('Create Partner Error:', err);
        res.status(500).json({ message: 'Server error creating partner.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Partner.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Partner not found.' });
        res.json({ message: 'Partner deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error deleting partner.' });
    }
});

module.exports = router;
