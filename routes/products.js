const express = require('express');
const router = express.Router();
const firebase = require('../config/firebase');

// GET - Obtener todos los productos
router.get('/', async (req, res) => {
    try {
        const snapshot = await firebase.db.collection('products').get();
        const products = [];
        snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
        res.json({ success: true, products });
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST - Crear nuevo producto
router.post('/', async (req, res) => {
    try {
        const { name, description, price, brand, quality_category, stock } = req.body;
        // Validar campos requeridos
        if (!name || !description || !price || !brand || !quality_category) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }
        if (price < 0 || stock < 0) {
            return res.status(400).json({
                success: false,
                message: 'Precio y stock no pueden ser negativos'
            });
        }
        // Crear producto en Firebase
        const productData = {
            name: name.trim(),
            description: description.trim(),
            price: parseFloat(price),
            brand: brand.trim(),
            quality_category,
            stock: parseInt(stock) || 0
        };
        const productRef = await firebase.db.collection('products').add(productData);
        res.json({
            success: true,
            message: 'Producto creado correctamente',
            product_id: productRef.id
        });
    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT - Actualizar producto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, brand, quality_category, stock } = req.body;
        const productRef = firebase.db.collection('products').doc(id);
        const doc = await productRef.get();
        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        const updateData = {};
        if (name) updateData.name = name.trim();
        if (description) updateData.description = description.trim();
        if (price !== undefined) updateData.price = parseFloat(price);
        if (brand) updateData.brand = brand.trim();
        if (quality_category) updateData.quality_category = quality_category;
        if (stock !== undefined) updateData.stock = parseInt(stock);
        if (updateData.price < 0 || updateData.stock < 0) {
            return res.status(400).json({
                success: false,
                message: 'Precio y stock no pueden ser negativos'
            });
        }
        await productRef.update(updateData);
        res.json({
            success: true,
            message: 'Producto actualizado correctamente'
        });
    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// DELETE - Eliminar producto
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const productRef = firebase.db.collection('products').doc(id);
        const doc = await productRef.get();
        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        await productRef.delete();
        res.json({
            success: true,
            message: 'Producto eliminado correctamente'
        });
    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST - Buscar productos
router.post('/search', async (req, res) => {
    try {
        const { search_term } = req.body;
        if (!search_term || search_term.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Término de búsqueda requerido'
            });
        }
        const snapshot = await firebase.db.collection('products').get();
        const products = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (
                (data.name && data.name.toLowerCase().includes(search_term.toLowerCase())) ||
                (data.description && data.description.toLowerCase().includes(search_term.toLowerCase()))
            ) {
                products.push({ id: doc.id, ...data });
            }
        });
        res.json({
            success: true,
            products,
            count: products.length
        });
    } catch (error) {
        console.error('Error buscando productos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET - Obtener producto por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await firebase.db.collection('products').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        res.json({
            success: true,
            product: { id: doc.id, ...doc.data() }
        });
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET - Obtener todos los productos de inventario
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/products llamado');
        const snapshot = await firebase.db.collection('products').get();
        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        console.log(`Productos devueltos: ${products.length}`);
        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router; 