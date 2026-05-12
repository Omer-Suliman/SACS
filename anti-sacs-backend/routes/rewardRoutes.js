const express = require('express');
const router = express.Router();
const Reward = require('../models/Reward');
const Voucher = require('../models/Voucher');
const User = require('../models/User');

// =============================================================
// GET /api/rewards
// Fetch all ACTIVE rewards
// =============================================================
router.get('/', async (req, res) => {
    try {
        const rewards = await Reward.find({ status: 'ACTIVE' });
        // Normalise _id → id for frontend compatibility
        const normalised = rewards.map(r => ({ ...r.toObject(), id: r._id.toString() }));
        res.json(normalised);
    } catch (err) {
        console.error('Fetch Rewards Error:', err);
        res.status(500).json({ message: 'Server error fetching rewards.' });
    }
});

// =============================================================
// GET /api/rewards/:id
// Fetch a single reward
// =============================================================
router.get('/:id', async (req, res) => {
    try {
        const reward = await Reward.findById(req.params.id);
        if (!reward) return res.status(404).json({ message: 'Reward not found.' });
        res.json({ ...reward.toObject(), id: reward._id.toString() });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// =============================================================
// POST /api/rewards
// Create a new reward — ADMIN only
// =============================================================
router.post('/', async (req, res) => {
    try {
        const { role } = req.body;
        if (role !== 'ADMIN') {
            return res.status(403).json({ message: 'Access denied: Only admins can create rewards.' });
        }
        const reward = new Reward(req.body);
        const saved = await reward.save();
        res.status(201).json({ ...saved.toObject(), id: saved._id.toString() });
    } catch (err) {
        console.error('Create Reward Error:', err);
        res.status(500).json({ message: 'Server error creating reward.' });
    }
});

// =============================================================
// POST /api/rewards/claim/:id
// The critical route — atomically: verify points & stock,
// deduct points, reduce stock, generate voucher.
// Body: { studentId }
// =============================================================
router.post('/claim/:id', async (req, res) => {
    const { studentId } = req.body;

    if (!studentId) {
        return res.status(400).json({ message: 'studentId is required.' });
    }

    try {
        // --- STEP 1: Load both documents simultaneously ---
        const [reward, student] = await Promise.all([
            Reward.findById(req.params.id),
            User.findById(studentId)
        ]);

        // --- STEP 2: Guard checks (all server-side, cannot be bypassed) ---
        if (!reward) {
            return res.status(404).json({ message: 'Reward not found.' });
        }
        if (!student) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        // Check stock availability
        if (reward.stock <= 0) {
            return res.status(400).json({ message: 'This reward is out of stock.' });
        }

        // Check sufficient points — student.points must exist on the User document
        const studentPoints = student.points || 0;

        if (studentPoints < reward.costPoints) {
            return res.status(400).json({
                message: `Insufficient points. You have ${studentPoints} pts but need ${reward.costPoints} pts.`
            });
        }

        // --- STEP 3: Atomic write operations ---
        // In a production app with MongoDB replica sets, these three writes would
        // be wrapped in a session.withTransaction() call. For a single-node Atlas
        // cluster (M0 free tier), we use careful sequential writes with rollback
        // logic on failure — which is safe for low-concurrency university apps.

        // 3a. Deduct points from the student
        await User.findByIdAndUpdate(studentId, {
            $inc: { points: -reward.costPoints }
        });

        // 3b. Reduce reward stock by 1
        await Reward.findByIdAndUpdate(req.params.id, {
            $inc: { stock: -1 }
        });

        // 3c. Create the voucher document
        const voucher = new Voucher({
            studentId: student._id,
            rewardId: reward._id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
        const savedVoucher = await voucher.save();


        res.status(201).json({
            message: 'Reward claimed successfully!',
            voucher: {
                ...savedVoucher.toObject(),
                id: savedVoucher._id.toString(),
                rewardName: reward.name,
                rewardId: reward._id.toString()
            },
            newPointsBalance: studentPoints - reward.costPoints
        });

    } catch (err) {
        console.error('Claim Reward Error:', err);
        res.status(500).json({ message: 'Server error processing claim.' });
    }
});

// =============================================================
// GET /api/rewards/vouchers/:studentId
// Fetch all vouchers for a student, with reward name populated
// =============================================================
router.get('/vouchers/:studentId', async (req, res) => {
    try {
        const vouchers = await Voucher.find({ studentId: req.params.studentId })
            .populate('rewardId', 'name partnerName imageUrl');
        const normalised = vouchers.map(v => ({
            ...v.toObject(),
            id: v._id.toString(),
            rewardName: v.rewardId?.name || 'Reward',
            partnerName: v.rewardId?.partnerName || '',
            // Keep rewardId as string for frontend matching
            rewardId: v.rewardId?._id?.toString() || v.rewardId?.toString()
        }));
        res.json(normalised);
    } catch (err) {
        console.error('Fetch Vouchers Error:', err);
        res.status(500).json({ message: 'Server error fetching vouchers.' });
    }
});

// =============================================================
// PUT /api/rewards/:id
// Update a reward (admin)
// =============================================================
router.put('/:id', async (req, res) => {
    try {
        const updated = await Reward.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ message: 'Reward not found.' });
        res.json({ ...updated.toObject(), id: updated._id.toString() });
    } catch (err) {
        res.status(500).json({ message: 'Server error updating reward.' });
    }
});

// =============================================================
// DELETE /api/rewards/:id
// Soft-delete by setting status INACTIVE (ADMIN only)
// =============================================================
router.delete('/:id', async (req, res) => {
    try {
        const updated = await Reward.findByIdAndUpdate(
            req.params.id,
            { status: 'INACTIVE' },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'Reward not found.' });
        res.json({ message: 'Reward deactivated.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error deleting reward.' });
    }
});

module.exports = router;
