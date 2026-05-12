const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const SALT_ROUNDS = 10;

// @route   POST /api/users/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, role } = req.body;
        // Accept either 'password' (plain) from the new frontend flow
        const plainPassword = req.body.password || req.body.hashedPassword;

        if (!email || !plainPassword) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'Registration failed: A user with this email already exists.' });
        }

        // Always hash with bcrypt before saving — never store plain or SHA-256 passwords
        const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

        const newUser = new User({
            name,
            email: email.toLowerCase(),
            hashedPassword,
            role: role || 'STUDENT'
        });

        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// @route   POST /api/users/login
// @desc    Authenticate a user using bcrypt.compare()
router.post('/login', async (req, res) => {
    try {

        const { email, password } = req.body;
        const plainPassword = password || req.body.hashedPassword;

        if (!email || !plainPassword) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Find user in MongoDB (search by lowercased email)
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found. Please check your email.' });
        }

        // User was found — inspect the stored hash and run bcrypt.compare
        const isMatch = await bcrypt.compare(password, user.hashedPassword);

        if (!isMatch) {
            console.warn(`[Login] Failed attempt for: ${email}`);
            return res.status(400).json({ message: 'Invalid credentials. Incorrect password.' });
        }

        // Return user data (hashedPassword excluded from client by convention)
        const { hashedPassword, ...safeUser } = user.toObject();
        res.json({ ...safeUser, id: user._id.toString() });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// @route   GET /api/users
// @desc    Get all users (for testing)
router.get('/', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        console.error('Fetch Users Error:', err);
        res.status(500).json({ message: 'Server error fetching users.' });
    }
});

// @route   GET /api/users/email/:email
// @desc    Get user by email (compatibility for db.js getUserByEmail)
router.get('/email/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email.toLowerCase() });
        res.json(user);
    } catch (err) {
        console.error('Fetch User by Email Error:', err);
        res.status(500).json({ message: 'Server error fetching user.' });
    }
});

// @route   PUT /api/users/:id/role
// @desc    Update a user's role (admin use)
router.put('/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ message: 'Role is required.' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { role: role } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(updatedUser);
    } catch (err) {
        console.error('Update Role Error:', err);
        res.status(500).json({ message: 'Server error updating user role.' });
    }
});

module.exports = router;
