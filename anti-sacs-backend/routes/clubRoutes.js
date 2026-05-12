const express = require('express');
const router = express.Router();
const Club = require('../models/Club');

// @route   GET /api/clubs
// @desc    Fetch all clubs, optionally filtered by status query param
// @access  Public
router.get('/', async (req, res) => {
    try {
        const filter = req.query.status ? { status: req.query.status } : {};
        const clubs = await Club.find(filter)
            .populate('lead', 'name email')      // replace lead ObjectId with name + email
            .populate('members', 'name');        // replace each member ObjectId with name
        res.json(clubs);
    } catch (err) {
        console.error('Fetch Clubs Error:', err);
        res.status(500).json({ message: 'Server error fetching clubs.' });
    }
});

// @route   GET /api/clubs/myclubs/:studentId
// @desc    Get all clubs a student is a member of
// @access  Student
// NOTE: Must come BEFORE /:id to prevent "myclubs" being treated as a club id
router.get('/myclubs/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        const clubs = await Club.find({ members: studentId })
            .populate('lead', 'name email')
            .populate('members', 'name');

        res.json(clubs);
    } catch (err) {
        console.error('Fetch My Clubs Error:', err);
        res.status(500).json({ message: 'Server error fetching student clubs.' });
    }
});

// @route   GET /api/clubs/:id
// @desc    Fetch a single club by its MongoDB _id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const club = await Club.findById(req.params.id)
            .populate('lead', 'name email')
            .populate('members', 'name');
        if (!club) return res.status(404).json({ message: 'Club not found.' });
        res.json(club);
    } catch (err) {
        console.error('Fetch Club Error:', err);
        res.status(500).json({ message: 'Server error fetching club.' });
    }
});

// @route   POST /api/clubs
// @desc    Create a new club
// @access  ADMIN or STAFF only (role checked via request body)
router.post('/', async (req, res) => {
    try {
        const { role } = req.body;

        // --- SERVER-SIDE ROLE GUARD ---
        const ALLOWED_ROLES = ['ADMIN', 'STAFF', 'STUDENT']; // students may propose clubs
        if (!role || !ALLOWED_ROLES.includes(role)) {
            console.warn(`[CLUBS] Forbidden POST attempt by role: "${role}"`);
            return res.status(403).json({
                message: 'Access denied: Only students, staff, or admins can create clubs.'
            });
        }

        const clubData = { ...req.body };
        if (clubData.lead) {
            clubData.members = [clubData.lead];
        }

        const newClub = new Club(clubData);
        const savedClub = await newClub.save();
        res.status(201).json(savedClub);
    } catch (err) {
        console.error('Create Club Error:', err);
        res.status(500).json({ message: 'Server error creating club.' });
    }
});

// @route   PUT /api/clubs/join/:id
// @desc    Add a student to the club's members array (no duplicates)
// @access  Student
router.put('/join/:id', async (req, res) => {
    try {
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ message: 'studentId is required.' });
        }

        // $addToSet is the key operator:
        // It only inserts studentId into the members array if it does not
        // already exist there — enforced atomically at the database level.
        const updatedClub = await Club.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { members: studentId } },
            { new: true }           // return the updated document
        ).populate('members', 'name');

        if (!updatedClub) {
            return res.status(404).json({ message: 'Club not found.' });
        }

        res.json({ message: 'Successfully joined club.', club: updatedClub });
    } catch (err) {
        console.error('Join Club Error:', err);
        res.status(500).json({ message: 'Server error joining club.' });
    }
});

// @route   PUT /api/clubs/leave/:id
// @desc    Remove a student from the club's members array
// @access  Student
router.put('/leave/:id', async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            return res.status(400).json({ message: 'studentId is required.' });
        }

        const updatedClub = await Club.findByIdAndUpdate(
            req.params.id,
            { $pull: { members: studentId } },
            { new: true }
        ).populate('members', 'name');

        if (!updatedClub) {
            return res.status(404).json({ message: 'Club not found.' });
        }

        res.json({ message: 'Successfully left club.', club: updatedClub });
    } catch (err) {
        console.error('Leave Club Error:', err);
        res.status(500).json({ message: 'Server error leaving club.' });
    }
});

// @route   PUT /api/clubs/:id
// @desc    Update club details (admin / club leader)
// @access  Protected
router.put('/:id', async (req, res) => {
    try {
        const updatedClub = await Club.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!updatedClub) return res.status(404).json({ message: 'Club not found.' });
        res.json(updatedClub);
    } catch (err) {
        console.error('Update Club Error:', err);
        res.status(500).json({ message: 'Server error updating club.' });
    }
});

// @route   DELETE /api/clubs/:id
// @desc    Delete a club
// @access  ADMIN only
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Club.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Club not found.' });
        res.json({ message: 'Club deleted successfully.' });
    } catch (err) {
        console.error('Delete Club Error:', err);
        res.status(500).json({ message: 'Server error deleting club.' });
    }
});

module.exports = router;
