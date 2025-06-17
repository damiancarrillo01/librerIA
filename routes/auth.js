const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST - Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        // Por ahora, usar un usuario de prueba
        // En producción, esto vendría de la base de datos
        const testUser = {
            id: '1',
            email: 'admin@libreriaia.com',
            username: 'admin',
            password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // 'password'
        };

        if (email !== testUser.email) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const isValidPassword = await bcrypt.compare(password, testUser.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Crear sesión
        req.session.user = {
            id: testUser.id,
            email: testUser.email,
            username: testUser.username
        };

        res.json({
            success: true,
            message: 'Login exitoso',
            user: {
                id: testUser.id,
                email: testUser.email,
                username: testUser.username
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST - Registro
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Las contraseñas no coinciden'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // Por ahora, solo simular el registro
        // En producción, esto guardaría en la base de datos
        const hashedPassword = await bcrypt.hash(password, 10);

        res.json({
            success: true,
            message: 'Usuario registrado exitosamente'
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST - Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error al cerrar sesión'
            });
        }

        res.json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
    });
});

// GET - Verificar sesión
router.get('/me', (req, res) => {
    if (req.session.user) {
        res.json({
            success: true,
            user: req.session.user
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'No hay sesión activa'
        });
    }
});

// Este código debería estar en tu archivo de rutas del backend
router.post('/api/ai/process', async (req, res) => {
    try {
        const { listType, quality } = req.body;
        
        // Aquí va la lógica de procesamiento con IA
        // Por ejemplo, llamar a un servicio de IA para generar recomendaciones
        
        // Simular respuesta exitosa
        res.json({
            success: true,
            listId: 'nueva-lista-id',
            message: 'Lista procesada exitosamente con IA'
        });
    } catch (error) {
        console.error('Error en procesamiento IA:', error);
        res.status(500).json({
            success: false,
            message: 'Error procesando lista con IA'
        });
    }
});

module.exports = router;