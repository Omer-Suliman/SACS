const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const User = require('../models/User');
const PointEvent = require('../models/PointEvent');

// @route   GET /api/activities
// @desc    Get all activities
router.get('/', async (req, res) => {
    try {
        const activities = await Activity.find().populate('createdBy', 'name email role');
        res.json(activities);
    } catch (err) {
        console.error('Fetch Activities Error:', err);
        res.status(500).json({ message: 'Server error fetching activities.' });
    }
});

// @route   GET /api/activities/registered/:studentId
// @desc    Get all activities a specific student has registered for
// @access  Student
// NOTE: Must come BEFORE /:id to prevent Express treating "registered" as an id param
router.get('/registered/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        const activities = await Activity.find({ registeredBy: studentId })
            .populate('createdBy', 'name email role');

        res.json(activities);
    } catch (err) {
        console.error('Fetch Registered Activities Error:', err);
        res.status(500).json({ message: 'Server error fetching registered activities.' });
    }
});

// @route   GET /api/activities/:id
// @desc    Get a single activity by its MongoDB _id
router.get('/:id', async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id)
            .populate('createdBy', 'name email role');
        if (!activity) return res.status(404).json({ message: 'Activity not found.' });
        res.json(activity);
    } catch (err) {
        console.error('Fetch Single Activity Error:', err);
        res.status(500).json({ message: 'Server error fetching activity.' });
    }
});

// @route   POST /api/activities
// @desc    Create a new activity
router.post('/', async (req, res) => {
    try {

        const { title, description, type, createdBy, startAt, endAt, location, capacity, points } = req.body;

        if (!createdBy) {
            return res.status(400).json({ message: 'Validation Error: createdBy is required.' });
        }

        const newActivity = new Activity({
            title, description, type, createdBy, startAt, endAt, location, capacity, points
        });

        const savedActivity = await newActivity.save();
        res.status(201).json(savedActivity);
    } catch (err) {
        console.error('Create Activity Error:', err);
        res.status(500).json({ message: 'Server error creating activity.' });
    }
});

// @route   PUT /api/activities/register/:id
// @desc    Register a student for an activity (adds to registeredBy[], no duplicates)
// @access  Student
router.put('/register/:id', async (req, res) => {
    try {
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ message: 'studentId is required to register.' });
        }

        const activity = await Activity.findById(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: 'Activity not found.' });
        }

        // Capacity check
        if (activity.registeredBy.length >= activity.capacity) {
            return res.status(400).json({ message: 'Activity is at full capacity.' });
        }

        // Prevent double-registration
        if (activity.registeredBy.map(id => id.toString()).includes(studentId.toString())) {
            return res.status(400).json({ message: 'You are already registered for this activity.' });
        }

        // Atomically add student using $addToSet
        const updated = await Activity.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { registeredBy: studentId } },
            { new: true }
        );

        res.json({ message: 'Registered successfully.', activity: updated });
    } catch (err) {
        console.error('Register Activity Error:', err);
        res.status(500).json({ message: 'Server error registering for activity.' });
    }
});

// @route   PUT /api/activities/unregister/:id
// @desc    Unregister a student from an activity
// @access  Student
router.put('/unregister/:id', async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            return res.status(400).json({ message: 'studentId is required.' });
        }

        const updated = await Activity.findByIdAndUpdate(
            req.params.id,
            { $pull: { registeredBy: studentId } },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'Activity not found.' });

        res.json({ message: 'Unregistered successfully.', activity: updated });
    } catch (err) {
        console.error('Unregister Activity Error:', err);
        res.status(500).json({ message: 'Server error unregistering from activity.' });
    }
});

// @route   PUT /api/activities/:id/attendance
// @desc    Mark a student as attended and award points
// @access  Staff/Admin
router.put('/:id/attendance', async (req, res) => {
    try {
        const { userEmail } = req.body;
        if (!userEmail) return res.status(400).json({ message: 'userEmail is required.' });

        const activity = await Activity.findById(req.params.id);
        if (!activity) return res.status(404).json({ message: 'Activity not found.' });

        const user = await User.findOne({ email: userEmail });
        if (!user) return res.status(404).json({ message: `Student with email ${userEmail} not found.` });

        // Registration Requirement Check
        if (!activity.registeredBy || !activity.registeredBy.map(id => id.toString()).includes(user._id.toString())) {
            return res.status(400).json({ message: 'Error: Student must register for the activity before they can be marked present.' });
        }

        // 1. Same-Day Restriction
        const now = new Date();
        const activityDate = new Date(activity.startAt);
        const isSameDay = now.getFullYear() === activityDate.getFullYear() &&
                          now.getMonth() === activityDate.getMonth() &&
                          now.getDate() === activityDate.getDate();

        if (!isSameDay) {
            return res.status(400).json({ message: 'Error: Attendance can only be recorded on the actual day of the activity.' });
        }

        // 2. Double-Scan Prevention (Strict Check)
        if (activity.attendedBy && activity.attendedBy.map(id => id.toString()).includes(user._id.toString())) {
            return res.status(400).json({ message: 'Error: Student has already been scanned for this activity. Points cannot be awarded twice.' });
        }

        // Add to attendedBy
        const updated = await Activity.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { attendedBy: user._id } },
            { new: true }
        );

        // Award points
        let pointsAwarded = 0;
        if (activity.points > 0) {
            pointsAwarded = activity.points;
            user.points = (user.points || 0) + pointsAwarded;
            user.lifetimePoints = (user.lifetimePoints || 0) + pointsAwarded;
            await user.save();

            const pe = new PointEvent({
                email: user.email,
                amount: pointsAwarded,
                reason: `Attended activity: ${activity.title}`,
                at: Date.now()
            });
            await pe.save();
        }

        res.json({ message: `Marked present and awarded ${pointsAwarded} points.`, activity: updated });
    } catch (err) {
        console.error('Mark Attendance Error:', err);
        res.status(500).json({ message: `Server error marking attendance: ${err.message}` });
    }
});

// @route   PUT /api/activities/:id
// @desc    Update an activity
router.put('/:id', async (req, res) => {
    try {
        const updated = await Activity.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ message: 'Activity not found.' });
        res.json(updated);
    } catch (err) {
        console.error('Update Activity Error:', err);
        res.status(500).json({ message: 'Server error updating activity.' });
    }
});

// @route   DELETE /api/activities/:id
// @desc    Delete an activity
router.delete('/:id', async (req, res) => {
    try {
        const result = await Activity.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ message: 'Activity not found.' });
        res.json({ message: 'Activity deleted successfully.' });
    } catch (err) {
        console.error('Delete Activity Error:', err);
        res.status(500).json({ message: 'Server error deleting activity.' });
    }
});



module.exports = router;
