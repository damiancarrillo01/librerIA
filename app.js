const express = require('express');
const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');

// Middleware
app.use(express.json());

// Define routes
app.use('/auth', authRoutes);
app.use('/api/ai', aiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

module.exports = app;