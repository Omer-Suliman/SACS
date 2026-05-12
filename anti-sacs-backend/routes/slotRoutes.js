const express = require('express');
const router = express.Router();
const Slot = require('../models/Slot');

// @route   GET /api/slots
// @desc    Get all appointment slots
router.get('/', async (req, res) => {
    try {
        const slots = await Slot.find().populate('createdByUserId', 'name email role');
        res.json(slots);
    } catch (err) {
        console.error('Fetch Slots Error:', err);
        res.status(500).json({ message: 'Server error fetching slots.' });
    }
});

// @route   GET /api/slots/booked/:studentId
// @desc    Get all slots booked by a specific student (replaces phantom /appointments route)
// @access  Student
router.get('/booked/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        // Find all slots where this student's ID exists in the bookedBy array
        const slots = await Slot.find({ bookedBy: studentId })
            .populate('createdByUserId', 'name email role');

        res.json(slots);
    } catch (err) {
        console.error('Fetch Booked Slots Error:', err);
        res.status(500).json({ message: 'Server error fetching booked slots.' });
    }
});

// @route   GET /api/slots/:id
// @desc    Get a single appointment slot by its MongoDB _id
// @access  Public
// NOTE: This route MUST come AFTER /booked/:studentId to avoid Express
//       treating "booked" as an :id parameter.
router.get('/:id', async (req, res) => {
    try {
        const slot = await Slot.findById(req.params.id)
            .populate('createdByUserId', 'name email role');
        if (!slot) {
            return res.status(404).json({ message: 'Slot not found.' });
        }
        res.json(slot);
    } catch (err) {
        console.error('Fetch Single Slot Error:', err);
        res.status(500).json({ message: 'Server error fetching slot.' });
    }
});

// @route   POST /api/slots
// @desc    Create a new appointment slot
// @access  DOCTOR and STAFF only
router.post('/', async (req, res) => {
    try {
        const { role } = req.body;

        // --- SERVER-SIDE ROLE GUARD ---
        const ALLOWED_ROLES = ['DOCTOR', 'STAFF'];
        if (!role || !ALLOWED_ROLES.includes(role)) {
            console.warn(`[SLOTS] Forbidden POST attempt by role: "${role}"`);
            return res.status(403).json({
                message: 'Access denied: Only Doctors and Staff can publish office hours.'
            });
        }

        const newSlot = new Slot(req.body);
        const savedSlot = await newSlot.save();
        res.status(201).json(savedSlot);
    } catch (err) {
        console.error('Create Slot Error:', err);
        res.status(500).json({ message: 'Server error creating slot.' });
    }
});

// @route   PUT /api/slots/book/:id
// @desc    Book a slot — increments booked count AND records studentId in bookedBy[]
// @access  Student
router.put('/book/:id', async (req, res) => {
    try {
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ message: 'studentId is required to book a slot.' });
        }

        const slot = await Slot.findById(req.params.id);
        if (!slot) {
            return res.status(404).json({ message: 'Slot not found.' });
        }
        if (slot.booked >= slot.capacity) {
            return res.status(400).json({ message: 'Slot is already fully booked.' });
        }
        // Prevent double-booking by the same student
        if (slot.bookedBy.map(id => id.toString()).includes(studentId.toString())) {
            return res.status(400).json({ message: 'You have already booked this slot.' });
        }

        // Atomically increment count and record who booked
        slot.booked += 1;
        slot.bookedBy.push(studentId);
        const updatedSlot = await slot.save();

        res.json({ message: 'Slot booked successfully.', slot: updatedSlot });
    } catch (err) {
        console.error('Book Slot Error:', err);
        res.status(500).json({ message: 'Server error booking slot.' });
    }
});

// @route   PUT /api/slots/cancel/:id
// @desc    Cancel a booked slot — decrements booked count AND removes studentId from bookedBy[]
// @access  Student
router.put('/cancel/:id', async (req, res) => {
    try {
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ message: 'studentId is required to cancel a slot.' });
        }

        const slot = await Slot.findById(req.params.id);
        if (!slot) {
            return res.status(404).json({ message: 'Slot not found.' });
        }
        
        // Prevent cancelling if not booked by student
        if (!slot.bookedBy.map(id => id.toString()).includes(studentId.toString())) {
            return res.status(400).json({ message: 'You have not booked this slot.' });
        }

        // Atomically decrement count and remove studentId
        slot.booked = Math.max(0, slot.booked - 1);
        slot.bookedBy = slot.bookedBy.filter(id => id.toString() !== studentId.toString());
        const updatedSlot = await slot.save();

        res.json({ message: 'Slot cancelled successfully.', slot: updatedSlot });
    } catch (err) {
        console.error('Cancel Slot Error:', err);
        res.status(500).json({ message: 'Server error cancelling slot.' });
    }
});

// @route   PUT /api/slots/:id
// @desc    Update slot details (admin / creator)
router.put('/:id', async (req, res) => {
    try {
        const updatedSlot = await Slot.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!updatedSlot) return res.status(404).json({ message: 'Slot not found.' });
        res.json(updatedSlot);
    } catch (err) {
        console.error('Update Slot Error:', err);
        res.status(500).json({ message: 'Server error updating slot.' });
    }
});

// @route   DELETE /api/slots/:id
// @desc    Delete a slot
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Slot.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Slot not found.' });
        res.json({ message: 'Slot deleted successfully.' });
    } catch (err) {
        console.error('Delete Slot Error:', err);
        res.status(500).json({ message: 'Server error deleting slot.' });
    }
});

module.exports = router;
