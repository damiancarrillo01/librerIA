const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const firebase = require('./config/firebase');
require('dotenv').config();

// Importar rutas
const shoppingRoutes = require('./routes/shopping');
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://proyecto1-d6fb7-85849.web.app', // URL de Firebase Hosting
    'https://proyecto1-d6fb7-85849.web.app'  // Re-añadida para forzar reconstrucción
];

const corsOptions = {
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (como las de Postman o apps móviles) o si el origen está en la lista blanca
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};

// Configuración de middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para rutas de API
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'libreria-ia-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de vistas y layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Verificar conexión a Firebase
console.log('✅ Firebase configurado:', firebase.db ? 'Conectado' : 'No conectado');

// Rutas API
app.use('/api/shopping', shoppingRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/ai', aiRoutes);

// Rutas de páginas
app.get('/', (req, res) => {
    res.render('home', { 
        title: 'Inicio',
        icon: 'home',
        showHeader: false,
        user: req.session.user || null
    });
});

app.get('/notes', (req, res) => {
    res.render('notes', { 
        title: 'Crear Lista de Compras',
        icon: 'plus',
        user: req.session.user || null
    });
});

app.get('/list/:id', (req, res) => {
    res.render('list-detail', { 
        title: 'Detalle de Lista',
        icon: 'list',
        listId: req.params.id,
        user: req.session.user || null
    });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('error', { 
        title: 'Página no encontrada',
        icon: 'exclamation-triangle',
        status: 404,
        message: 'Página no encontrada',
        details: 'La página que buscas no existe o ha sido movida.',
        user: req.session.user || null
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        title: 'Error del servidor',
        icon: 'exclamation-triangle',
        status: 500,
        message: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Ha ocurrido un error inesperado.',
        user: req.session.user || null
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📚 Librería IA - Asistente de Compras`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔥 Base de datos: Firebase`);
}); 