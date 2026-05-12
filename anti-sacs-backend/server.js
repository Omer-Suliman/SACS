const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static Frontend Serving (Securely mounted to avoid exposing backend files)
const path = require('path');
const frontendPath = path.join(__dirname, '../');
app.use('/js', express.static(path.join(frontendPath, 'js')));
app.use('/css', express.static(path.join(frontendPath, 'css')));
app.use('/components', express.static(path.join(frontendPath, 'components')));
app.get('/style.css', (req, res) => res.sendFile(path.join(frontendPath, 'style.css')));


// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to SACS Database on MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
const userRoutes = require('./routes/userRoutes');
const activityRoutes = require('./routes/activityRoutes');
const slotRoutes = require('./routes/slotRoutes');
const clubRoutes = require('./routes/clubRoutes');
const clubEventRoutes = require('./routes/clubEventRoutes');
const clubPostRoutes = require('./routes/clubPostRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const partnerRedemptionRoutes = require('./routes/partnerRedemptionRoutes');
const walletRoutes = require('./routes/walletRoutes');

app.use('/api/users', userRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/club-events', clubEventRoutes);
app.use('/api/club-posts', clubPostRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/partner-redemptions', partnerRedemptionRoutes);
app.use('/api/wallet', walletRoutes);

// Serve Frontend HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
