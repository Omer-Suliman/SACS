const express = require('express');
const router = express.Router();
const Voucher = require('../models/Voucher');

// @route   GET /api/vouchers/:code
// @desc    Verify a voucher by code
router.get('/:code', async (req, res) => {
    try {
        const voucher = await Voucher.findOne({ code: req.params.code }).populate('rewardId', 'name partnerName');
        if (!voucher) return res.status(404).json({ message: 'Voucher not found.' });
        
        res.json({
            ...voucher.toObject(),
            id: voucher._id.toString(),
            rewardName: voucher.rewardId?.name,
            partnerName: voucher.rewardId?.partnerName
        });
    } catch (err) {
        console.error('Verify Voucher Error:', err);
        res.status(500).json({ message: 'Server error verifying voucher.' });
    }
});

// @route   PUT /api/vouchers/:code
// @desc    Update voucher status (e.g. mark as REDEEMED)
router.put('/:code', async (req, res) => {
    try {
        const updated = await Voucher.findOneAndUpdate(
            { code: req.params.code },
            { $set: req.body },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'Voucher not found.' });
        res.json(updated);
    } catch (err) {
        console.error('Update Voucher Error:', err);
        res.status(500).json({ message: 'Server error updating voucher.' });
    }
});

module.exports = router;
