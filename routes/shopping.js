const express = require('express');
const router = express.Router();
const firebase = require('../config/firebase');
const AIService = require('../services/aiService');
const PDFDocument = require('pdfkit');

// GET - Obtener todas las listas de compras (solo ejemplo, puedes mejorar la consulta según tu estructura de usuarios)
router.get('/', async (req, res) => {
    try {
        const snapshot = await firebase.db.collection('shopping_lists').get();
        const lists = [];
        snapshot.forEach(doc => {
            lists.push({ id: doc.id, ...doc.data() });
        });
        res.json({
            success: true,
            lists: lists
        });
    } catch (error) {
        console.error('Error obteniendo listas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST - Crear nueva lista de compras
router.post('/', async (req, res) => {
    try {
        const { name, quality_preference = 'cualquiera', items_text } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de la lista es requerido'
            });
        }

        // Crear la lista en Firebase
        const listData = {
            name: name,
            quality_preference: quality_preference,
            user_id: req.session.user ? req.session.user.id : null,
            created_at: new Date()
        };
        const listRef = await firebase.db.collection('shopping_lists').add(listData);
        const listId = listRef.id;

        // Procesar ítems si se proporcionan
        if (items_text) {
            const items = parseItemsFromText(items_text);
            for (const item of items) {
                const itemData = {
                    shopping_list_id: listId,
                    item_name_raw: item.name,
                    quantity_requested: item.quantity,
                    created_at: new Date()
                };
                await firebase.db.collection('shopping_list_items').add(itemData);
            }
        }

        res.json({
            success: true,
            message: 'Lista de compras creada exitosamente',
            list_id: listId
        });

    } catch (error) {
        console.error('Error creando lista:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET - Obtener lista específica con ítems
router.get('/:id', async (req, res) => {
    try {
        const doc = await firebase.db.collection('shopping_lists').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Lista no encontrada'
            });
        }
        const list = doc.data();
        // Obtener ítems de la lista
        const itemsSnapshot = await firebase.db.collection('shopping_list_items')
            .where('shopping_list_id', '==', req.params.id).get();
        const items = [];
        itemsSnapshot.forEach(doc => items.push(doc.data()));
        res.json({
            success: true,
            list: list,
            items: items
        });
    } catch (error) {
        console.error('Error obteniendo lista:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST - Crear lista estándar
router.post('/standard/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { quality_preference = 'cualquiera' } = req.body;
        const standardLists = AIService.getStandardLists();
        const standardList = standardLists[type];
        if (!standardList) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de lista estándar no válido'
            });
        }
        // Crear la lista en Firebase
        const listData = {
            name: standardList.name,
            quality_preference: quality_preference,
            user_id: req.session.user ? req.session.user.id : null,
            created_at: new Date()
        };
        const listRef = await firebase.db.collection('shopping_lists').add(listData);
        const listId = listRef.id;
        // Agregar ítems de la lista estándar directamente
        for (const item of standardList.items) {
            const itemData = {
                shopping_list_id: listId,
                item_name_raw: item.name,
                quantity_requested: item.quantity,
                category: item.category,
                created_at: new Date()
            };
            await firebase.db.collection('shopping_list_items').add(itemData);
        }
        res.json({
            success: true,
            message: 'Lista estándar creada exitosamente',
            list_id: listId
        });
    } catch (error) {
        console.error('Error creando lista estándar:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST - Obtener sugerencias de IA (puedes mejorar esto si lo necesitas)
router.post('/ai-suggestions', async (req, res) => {
    try {
        const { item_name, quantity, quality_preference = 'cualquiera' } = req.body;
        if (!item_name) {
            return res.status(400).json({
                success: false,
                message: 'Nombre del ítem es requerido'
            });
        }
        // Crear sugerencias básicas sin depender de MongoDB
        const suggestions = [
            {
                name: item_name,
                category: 'Otros',
                price: 0,
                quality: quality_preference
            }
        ];
        res.json(suggestions);
    } catch (error) {
        console.error('Error obteniendo sugerencias de IA:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Función auxiliar para parsear texto de ítems
function parseItemsFromText(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const items = [];
    for (const line of lines) {
        const match = line.match(/^(\d+)\s+(.*)$/);
        if (match) {
            items.push({ quantity: parseInt(match[1], 10), name: match[2] });
        } else {
            items.push({ quantity: 1, name: line });
        }
    }
    return items;
}

module.exports = router; 