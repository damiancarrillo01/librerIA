const express = require('express');
const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const productsRouter = require('./routes/products');

// Middleware
app.use(express.json());

// Middleware para rutas de API
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Define routes
app.use('/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/shopping', require('./routes/shopping'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/products', productsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (req.path.startsWith('/api')) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    } else {
        res.status(500).send('Something broke!');
    }
});

module.exports = app;