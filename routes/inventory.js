const express = require('express');
const router = express.Router();
const firebase = require('../config/firebase');
const admin = require('firebase-admin');

// Obtener todos los productos del inventario
router.get('/', async (req, res) => {
    try {
        const inventoryRef = firebase.db.collection('inventory');
        const snapshot = await inventoryRef.get();
        
        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error('Error al obtener inventario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el inventario'
        });
    }
});

// Obtener un producto específico
router.get('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        console.log('🔍 Buscando producto con ID:', productId);
        
        const productRef = firebase.db.collection('inventory').doc(productId);
        const productDoc = await productRef.get();

        if (!productDoc.exists) {
            console.log('❌ Producto no encontrado:', productId);
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        const productData = productDoc.data();
        console.log('✅ Producto encontrado:', {
            id: productDoc.id,
            name: productData.name,
            category: productData.category,
            price: productData.price
        });

        res.json({
            success: true,
            product: {
                id: productDoc.id,
                ...productData
            }
        });
    } catch (error) {
        console.error('❌ Error al obtener producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el producto'
        });
    }
});

// Agregar uno o varios productos al inventario
router.post('/', async (req, res) => {
    try {
        let products = req.body;
        // Si no es un array, lo convertimos en array
        if (!Array.isArray(products)) {
            products = [products];
        }
        const results = [];
        for (const product of products) {
            const {
                name,
                description,
                price,
                category,
                stock,
                options = []
            } = product;

            if (!name || !price || !category) {
                results.push({ success: false, message: 'Faltan campos requeridos', product });
                continue;
            }

            const productData = {
                name,
                description: description || '',
                price: parseFloat(price),
                category,
                stock: parseInt(stock) || 0,
                options: options.map(opt => ({
                    ...opt,
                    price: parseFloat(opt.price)
                })),
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            };

            try {
                const docRef = await firebase.db.collection('inventory').add(productData);
                results.push({ success: true, message: 'Producto agregado correctamente', product_id: docRef.id });
            } catch (error) {
                results.push({ success: false, message: 'Error al agregar el producto', error: error.message, product });
            }
        }
        // Si solo era uno, responde como antes
        if (results.length === 1) {
            return res.json(results[0]);
        }
        // Si eran varios, responde con el array de resultados
        res.json({ success: true, results });
    } catch (error) {
        console.error('Error al agregar producto(s):', error);
        res.status(500).json({
            success: false,
            message: 'Error al agregar el/los producto(s)'
        });
    }
});

// Actualizar un producto del inventario
router.put('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const {
            name,
            description,
            price,
            category,
            stock,
            options
        } = req.body;

        const productRef = firebase.db.collection('inventory').doc(productId);
        const productDoc = await productRef.get();

        if (!productDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        const updateData = {
            ...(name && { name }),
            ...(description && { description }),
            ...(price && { price: parseFloat(price) }),
            ...(category && { category }),
            ...(stock && { stock: parseInt(stock) }),
            ...(options && { 
                options: options.map(opt => ({
                    ...opt,
                    price: parseFloat(opt.price)
                }))
            }),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        await productRef.update(updateData);

        res.json({
            success: true,
            message: 'Producto actualizado correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el producto'
        });
    }
});

// Eliminar un producto del inventario
router.delete('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const productRef = firebase.db.collection('inventory').doc(productId);
        const productDoc = await productRef.get();

        if (!productDoc.exists) {
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
        console.error('Error al eliminar producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el producto'
        });
    }
});

module.exports = router; 