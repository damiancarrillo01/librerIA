const express = require('express');
const router = express.Router();
const firebase = require('../config/firebase');
const AIService = require('../services/aiService');
const PDFDocument = require('pdfkit');
const admin = require('firebase-admin');

// GET - Obtener todas las listas de compras (solo ejemplo, puedes mejorar la consulta según tu estructura de usuarios)
router.get('/', async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user.id : null;
        // Temporalmente, para desarrollo, si no hay user_id, se muestran todas.
        // En producción, aquí habría que retornar un error 401 si no hay userId.
        
        let query = firebase.db.collection('shopping_lists');
        if (userId) {
            query = query.where('user_id', '==', userId);
        }
        
        const snapshot = await query.orderBy('created_at', 'desc').get();
        
        const lists = [];
        for (const doc of snapshot.docs) {
            const listData = doc.data();
            
            // Contar los ítems de cada lista
            const itemsSnapshot = await firebase.db.collection('shopping_list_items')
                .where('shopping_list_id', '==', doc.id)
                .get();
            
            lists.push({
                id: doc.id,
                ...listData,
                item_count: itemsSnapshot.size // Añadir el conteo de ítems
            });
        }
        
        res.json({ success: true, lists: lists });

    } catch (error) {
        console.error("Error obteniendo listas de compras:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Simulación de IA: busca el producto más parecido con stock suficiente
async function buscarProductoIA(nombreSolicitado, cantidad) {
    const snapshot = await firebase.db.collection('products').get();
    let mejorProducto = null;
    let mejorScore = 0;
    snapshot.forEach(doc => {
        const prod = doc.data();
        // Score simple: nombre incluido y stock suficiente
        let score = 0;
        if (prod.name && prod.name.toLowerCase().includes(nombreSolicitado.toLowerCase())) score += 2;
        if (prod.stock >= cantidad) score += 1;
        if (score > mejorScore) {
            mejorScore = score;
            mejorProducto = { id: doc.id, ...prod };
        }
    });
    return (mejorProducto && mejorProducto.stock >= cantidad) ? mejorProducto : null;
}

// POST - Crear nueva lista de compras con IA (REFACTORIZADO)
router.post('/', async (req, res) => {
    try {
        const { name, quality_preference, items_text, client_description } = req.body;
        if (!name || !items_text) {
            return res.status(400).json({ success: false, message: 'El nombre y los ítems de la lista son requeridos.' });
        }

        // 1. Crear el documento de la lista primero.
        const listData = {
            name,
            quality_preference: quality_preference || 'cualquiera',
            client_description: client_description || '',
            user_id: req.session.user ? req.session.user.id : null,
            created_at: new Date()
        };
        const listRef = await firebase.db.collection('shopping_lists').add(listData);

        // 2. Procesar los ítems con el nuevo servicio refactorizado.
        const itemsToProcess = parseItemsFromText(items_text);
        const result = await AIService.processShoppingList(
            itemsToProcess,
            { description: client_description },
            quality_preference
        );
        
        // 3. Guardar los productos encontrados en la base de datos (batch write).
        if (result.added_items && result.added_items.length > 0) {
            const batch = firebase.db.batch();
            result.added_items.forEach(item => {
                const newItemRef = firebase.db.collection('shopping_list_items').doc();
                const itemData = {
                    shopping_list_id: listRef.id,
                    item_name_raw: item.name,
                    quantity_requested: item.quantity_requested,
                    inventory_product_id: item.id,
                    price: item.price,
                    brand: item.brand,
                    category: item.category,
                    ai_reason: item.reasoning,
                    created_at: new Date(),
                };
                batch.set(newItemRef, itemData);
            });
            await batch.commit();
        }

        // 4. Devolver la respuesta detallada al frontend.
        res.json({
            success: true,
            message: 'Lista procesada.',
            list_id: listRef.id,
            added_items: result.added_items,
            not_found_items: result.not_found_items
        });

    } catch (error) {
        console.error('Error creando lista:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// GET - Obtener lista específica con ítems
router.get('/:id', async (req, res) => {
    console.log('GET /api/shopping/:id llamado', { id: req.params.id });
    try {
        const doc = await firebase.db.collection('shopping_lists').doc(req.params.id).get();
        if (!doc.exists) {
            console.log('Lista no encontrada', { id: req.params.id });
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
        itemsSnapshot.forEach(doc => {
            items.push({
                id: doc.id,
                _id: doc.id,
                ...doc.data()
            });
        });
        console.log('Lista encontrada y items cargados', { id: req.params.id, itemsCount: items.length });
        res.json({
            success: true,
            list: {
                id: doc.id,
                ...list
            },
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

// DELETE - Eliminar lista de compras
router.delete('/:id', async (req, res) => {
    console.log('DELETE /:id llamada', { id: req.params.id });
    try {
        const listId = req.params.id;
        // Verificar si la lista existe
        const listDoc = await firebase.db.collection('shopping_lists').doc(listId).get();
        if (!listDoc.exists) {
            console.log('Lista no encontrada al eliminar', { id: listId });
            return res.status(404).json({
                success: false,
                message: 'Lista no encontrada'
            });
        }
        // Eliminar todos los ítems de la lista
        const itemsSnapshot = await firebase.db.collection('shopping_list_items')
            .where('shopping_list_id', '==', listId)
            .get();
        console.log('Ítems encontrados para eliminar:', itemsSnapshot.size, 'para la lista', listId);
        const batch = firebase.db.batch();
        // Agregar operaciones de eliminación para cada ítem
        itemsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        // Agregar operación de eliminación para la lista
        batch.delete(firebase.db.collection('shopping_lists').doc(listId));
        // Ejecutar todas las operaciones en lote
        await batch.commit();
        console.log('Lista y sus ítems eliminados correctamente', { id: listId });
        res.json({
            success: true,
            message: 'Lista eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando lista:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT - Actualizar lista de compras
router.put('/:id', async (req, res) => {
    console.log('PUT /:id llamada', { id: req.params.id, body: req.body });
    try {
        const listId = req.params.id;
        const { name, quality_preference, items_text, client_description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'El nombre de la lista es requerido.' });
        }

        // 1. Actualizar metadatos de la lista
        await firebase.db.collection('shopping_lists').doc(listId).update({
            name: name,
            quality_preference: quality_preference || 'cualquiera',
            client_description: client_description || '',
            updated_at: new Date()
        });

        let addedItems = [];
        let notFoundItems = [];

        // 2. Si se proveyeron ítems, reemplazar los existentes
        if (items_text) {
            // Borrar todos los ítems antiguos de la lista
            const itemsSnapshot = await firebase.db.collection('shopping_list_items').where('shopping_list_id', '==', listId).get();
            const deleteBatch = firebase.db.batch();
            itemsSnapshot.forEach(doc => deleteBatch.delete(doc.ref));
            await deleteBatch.commit();

            // Agregar los nuevos ítems con la misma lógica de selección inteligente
            const items = parseItemsFromText(items_text);
            const selectionResult = await AIService.processShoppingList(items, { description: client_description }, quality_preference);

            if (selectionResult.success) {
                for (const p of selectionResult.added_items) {
                    await firebase.db.collection('shopping_list_items').add({ shopping_list_id: listId, ...p });
                    addedItems.push(p);
                }
                if (selectionResult.not_found_items) {
                    notFoundItems = selectionResult.not_found_items.map(item => ({ name: item.name, reason: item.reason }));
                }
            } else {
                notFoundItems = items.map(item => ({ name: item.name, reason: "Error del servicio de IA." }));
            }
        }

        // 3. Devolver la respuesta detallada
        res.json({
            success: true,
            message: 'Lista actualizada exitosamente',
            list_id: listId,
            added_items: addedItems,
            not_found_items: notFoundItems
        });

    } catch (error) {
        console.error('Error actualizando lista:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// POST - Crear lista estándar
router.post('/standard/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { quality_preference = 'cualquiera', client_description } = req.body;
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
            client_description: client_description || '',
            user_id: req.session.user ? req.session.user.id : null,
            created_at: new Date()
        };
        const listRef = await firebase.db.collection('shopping_lists').add(listData);
        const listId = listRef.id;
        
        // Usar selección inteligente de IA si hay descripción del cliente
        if (client_description && client_description.trim()) {
            try {
                const aiSelection = await AIService.selectProductsIntelligently(
                    standardList.items,
                    client_description,
                    quality_preference
                );
                
                // Procesar productos seleccionados por IA
                for (const selectedProduct of aiSelection.selected_products) {
                    const itemData = {
                        shopping_list_id: listId,
                        item_name_raw: selectedProduct.name,
                        quantity_requested: selectedProduct.quantity,
                        category: selectedProduct.category || 'Otros',
                        created_at: new Date(),
                        inventory_product_id: selectedProduct.inventory_id,
                        price: selectedProduct.price,
                        brand: selectedProduct.brand || '',
                        ai_reason: selectedProduct.reason || ''
                    };
                    await firebase.db.collection('shopping_list_items').add(itemData);
                }
                
                // Agregar productos adicionales sugeridos por IA
                if (aiSelection.additional_suggestions && aiSelection.additional_suggestions.length > 0) {
                    for (const suggestion of aiSelection.additional_suggestions) {
                        const itemData = {
                            shopping_list_id: listId,
                            item_name_raw: suggestion.name,
                            quantity_requested: suggestion.quantity || 1,
                            category: suggestion.category || 'Otros',
                            created_at: new Date(),
                            inventory_product_id: suggestion.inventory_id,
                            price: suggestion.price,
                            brand: suggestion.brand || '',
                            ai_reason: suggestion.reason || 'Sugerencia adicional de IA'
                        };
                        await firebase.db.collection('shopping_list_items').add(itemData);
                    }
                }
                
            } catch (aiError) {
                console.error('Error en selección inteligente de IA:', aiError);
                // Fallback al método original si la IA falla
                for (const item of standardList.items) {
                    const itemData = {
                        shopping_list_id: listId,
                        item_name_raw: item.name,
                        quantity_requested: item.quantity,
                        category: item.category || 'Otros',
                        created_at: new Date()
                    };
                    await firebase.db.collection('shopping_list_items').add(itemData);
                }
            }
        } else {
            // Método original sin IA
            for (const item of standardList.items) {
                const itemData = {
                    shopping_list_id: listId,
                    item_name_raw: item.name,
                    quantity_requested: item.quantity,
                    category: item.category || 'Otros',
                    created_at: new Date()
                };
                await firebase.db.collection('shopping_list_items').add(itemData);
            }
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

// Obtener detalles de una lista específica
router.get('/:listId', async (req, res) => {
    try {
        const { listId } = req.params;
        const listRef = firebase.db.collection('shopping_lists').doc(listId);
        const listDoc = await listRef.get();

        if (!listDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Lista no encontrada'
            });
        }

        const list = listDoc.data();
        const itemsSnapshot = await listRef.collection('items').get();
        const items = itemsSnapshot.docs.map(doc => ({
            id: doc.id,
            _id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            list: {
                id: listDoc.id,
                ...list
            },
            items
        });
    } catch (error) {
        console.error('Error al obtener lista:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la lista'
        });
    }
});

// Obtener un producto específico
router.get('/:listId/items/:itemId', async (req, res) => {
    try {
        const { listId, itemId } = req.params;
        
        if (!listId || !itemId) {
            return res.status(400).json({
                success: false,
                message: 'ID de lista o producto no proporcionado'
            });
        }

        // Buscar el ítem en la colección shopping_list_items
        const itemRef = firebase.db.collection('shopping_list_items').doc(itemId);
        const itemDoc = await itemRef.get();
        if (!itemDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        const item = itemDoc.data();
        if (item.shopping_list_id !== listId) {
            return res.status(404).json({
                success: false,
                message: 'Producto no pertenece a la lista'
            });
        }
        res.json({
            success: true,
            item: {
                id: itemDoc.id,
                _id: itemDoc.id,
                ...item
            }
        });
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el producto'
        });
    }
});

// Actualizar un producto
router.put('/:listId/items/:itemId', async (req, res) => {
    try {
        const { listId, itemId } = req.params;
        const { item_name_raw, quantity_requested, category } = req.body;

        // Buscar el ítem en la colección shopping_list_items
        const itemRef = firebase.db.collection('shopping_list_items').doc(itemId);
        const itemDoc = await itemRef.get();
        if (!itemDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        const item = itemDoc.data();
        if (item.shopping_list_id !== listId) {
            return res.status(404).json({
                success: false,
                message: 'Producto no pertenece a la lista'
            });
        }
        await itemRef.update({
            item_name_raw,
            quantity_requested,
            category,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
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

// Eliminar un producto
router.delete('/:listId/items/:itemId', async (req, res) => {
    try {
        const { listId, itemId } = req.params;
        // Buscar el ítem en la colección shopping_list_items
        const itemRef = firebase.db.collection('shopping_list_items').doc(itemId);
        const itemDoc = await itemRef.get();
        if (!itemDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        const item = itemDoc.data();
        if (item.shopping_list_id !== listId) {
            return res.status(404).json({
                success: false,
                message: 'Producto no pertenece a la lista'
            });
        }
        await itemRef.delete();
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

// Obtener opciones de un producto
router.get('/:listId/items/:itemId/options', async (req, res) => {
    console.log('GET /api/shopping/:listId/items/:itemId/options llamado', req.params);
    try {
        const { listId, itemId } = req.params;
        if (!listId || !itemId) {
            return res.status(400).json({
                success: false,
                message: 'ID de lista o producto no proporcionado'
            });
        }
        // Buscar el ítem en la colección shopping_list_items
        const itemRef = firebase.db.collection('shopping_list_items').doc(itemId);
        const itemDoc = await itemRef.get();
        if (!itemDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        const item = itemDoc.data();
        // Validar que el ítem pertenezca a la lista
        if (item.shopping_list_id !== listId) {
            return res.status(404).json({
                success: false,
                message: 'Producto no pertenece a la lista'
            });
        }
        // Buscar todas las opciones en inventario cuyo nombre contenga el texto solicitado
        const productsSnapshot = await firebase.db.collection('products').get();
        const options = [];
        productsSnapshot.forEach(doc => {
            const prod = doc.data();
            if (prod.name && prod.name.toLowerCase().includes(item.item_name_raw.toLowerCase())) {
                options.push({
                    id: doc.id,
                    name: prod.name,
                    description: prod.description || '',
                    price: prod.price || 0,
                    brand: prod.brand || '',
                    stock: prod.stock || 0,
                    selected: doc.id === item.inventory_product_id
                });
            }
        });
        console.log(`Opciones encontradas: ${options.length} para item_name_raw: ${item.item_name_raw}`);
        res.json({
            success: true,
            options
        });
    } catch (error) {
        console.error('Error al obtener opciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener opciones del producto'
        });
    }
});

// Obtener alternativas de un producto (NUEVA LÓGICA CON IA)
router.get('/:listId/items/:itemId/alternatives', async (req, res) => {
    try {
        const { itemId } = req.params;

        // 1. Obtener el ítem original
        const itemDoc = await firebase.db.collection('shopping_list_items').doc(itemId).get();
        if (!itemDoc.exists) {
            return res.status(404).json({ success: false, message: 'Ítem no encontrado.' });
        }
        const originalItem = { id: itemDoc.id, ...itemDoc.data() };
        
        // 2. Usar IA (o reglas) para obtener la "esencia" del producto.
        const coreTerm = await AIService.getProductEssence(originalItem.item_name_raw);
        
        // Si no se pudo determinar una esencia, no devolver alternativas.
        if (!coreTerm) {
            return res.json({ success: true, alternatives: [] });
        }

        // 3. Buscar productos que compartan la misma esencia en la base de datos.
        const productsSnapshot = await firebase.db.collection('products').get();
        const alternatives = [];
        
        productsSnapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const alternativeName = product.name.toLowerCase();

            // Condición:
            // 1. No es el mismo producto que el original.
            // 2. El nombre del producto alternativo DEBE incluir la esencia.
            if (originalItem.inventory_product_id !== product.id && alternativeName.includes(coreTerm)) {
                alternatives.push(product);
            }
        });
        
        res.json({ success: true, alternatives: alternatives.slice(0, 10) });

    } catch (error) {
        console.error("Error obteniendo alternativas:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Reemplazar un ítem de la lista con una alternativa
router.post('/:listId/items/:itemId/replace', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { new_product_id } = req.body;

        if (!new_product_id) {
            return res.status(400).json({ success: false, message: 'Se requiere el ID del nuevo producto.' });
        }

        // 1. Obtener el nuevo producto del inventario
        const newProductDoc = await firebase.db.collection('products').doc(new_product_id).get();
        if (!newProductDoc.exists) {
            return res.status(404).json({ success: false, message: 'El producto de reemplazo no se encuentra en el inventario.' });
        }
        const newProduct = newProductDoc.data();

        // 2. Obtener el ítem original de la lista para mantener la cantidad
        const originalItemDoc = await firebase.db.collection('shopping_list_items').doc(itemId).get();
        if (!originalItemDoc.exists) {
            return res.status(404).json({ success: false, message: 'El ítem original a reemplazar no existe.' });
        }
        const originalItem = originalItemDoc.data();

        // 3. Actualizar el ítem en la lista con los datos del nuevo producto
        await firebase.db.collection('shopping_list_items').doc(itemId).update({
            item_name_raw: newProduct.name,
            inventory_product_id: new_product_id,
            price: newProduct.price,
            brand: newProduct.brand,
            category: newProduct.category,
            quality_category: newProduct.quality_category,
            ai_reason: 'Reemplazado manualmente por el usuario.',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Producto reemplazado con éxito.' });

    } catch (error) {
        console.error("Error reemplazando producto:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Seleccionar una opción de producto
router.post('/:listId/items/:itemId/select-option', async (req, res) => {
    try {
        const { listId, itemId } = req.params;
        const { option_id } = req.body;
        // Buscar el ítem en la colección shopping_list_items
        const itemRef = firebase.db.collection('shopping_list_items').doc(itemId);
        const itemDoc = await itemRef.get();
        if (!itemDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        const item = itemDoc.data();
        if (item.shopping_list_id !== listId) {
            return res.status(404).json({
                success: false,
                message: 'Producto no pertenece a la lista'
            });
        }
        await itemRef.update({
            selected_option: option_id,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({
            success: true,
            message: 'Opción seleccionada correctamente'
        });
    } catch (error) {
        console.error('Error al seleccionar opción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al seleccionar la opción'
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