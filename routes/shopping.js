const router = express.Router();
const firebase = require('../config/firebase');
const AIService = require('../services/aiService');
const PDFDocument = require('pdfkit');
const admin = require('firebase-admin');

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

// POST - Crear nueva lista de compras con IA
router.post('/', async (req, res) => {
    console.log('POST /api/shopping llamado', req.body);
    try {
        const { name, quality_preference = 'cualquiera', items_text } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'El nombre de la lista es requerido' });
        }
        const listData = {
            name: name,
            quality_preference: quality_preference,
            user_id: req.session.user ? req.session.user.id : null,
            created_at: new Date()
        };
        const listRef = await firebase.db.collection('shopping_lists').add(listData);
        const listId = listRef.id;

        let noStockItems = [];
        let addedItems = [];
        if (items_text) {
            const items = parseItemsFromText(items_text);
            for (const item of items) {
                const producto = await buscarProductoIA(item.name, item.quantity);
                if (producto) {
                    // Agregar a la lista de compras
                    const itemData = {
                        shopping_list_id: listId,
                        item_name_raw: producto.name,
                        quantity_requested: item.quantity,
                        created_at: new Date(),
                        inventory_product_id: producto.id,
                        price: producto.price,
                        brand: producto.brand || '',
                        category: producto.category || ''
                    };
                    await firebase.db.collection('shopping_list_items').add(itemData);
                    addedItems.push({
                        name: producto.name,
                        quantity: item.quantity,
                        inventory_product_id: producto.id
                    });
                } else {
                    noStockItems.push({
                        name: item.name,
                        quantity_requested: item.quantity,
                        stock_disponible: 0
                    });
                }
            }
        }

        res.json({
            success: true,
            message: 'Lista de compras creada exitosamente',
            list_id: listId,
            added_items: addedItems,
            no_stock_items: noStockItems
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
        itemsSnapshot.forEach(doc => items.push(doc.data()));
        console.log('Lista encontrada y items cargados', { id: req.params.id, itemsCount: items.length });
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
        const { name, quality_preference, items_text } = req.body;

        if (!name) {
            console.log('Falta el nombre de la lista');
            return res.status(400).json({
                success: false,
                message: 'El nombre de la lista es requerido'
            });
        }

        // Verificar si la lista existe
        const listDoc = await firebase.db.collection('shopping_lists').doc(listId).get();
        if (!listDoc.exists) {
            console.log('Lista no encontrada al actualizar', { id: listId });
            return res.status(404).json({
                success: false,
                message: 'Lista no encontrada'
            });
        }

        // Actualizar datos de la lista
        await firebase.db.collection('shopping_lists').doc(listId).update({
            name: name,
            quality_preference: quality_preference || 'cualquiera',
            updated_at: new Date()
        });
        console.log('Datos de la lista actualizados', { id: listId });

        // Si hay ítems nuevos, eliminar los antiguos y agregar los nuevos
        if (items_text) {
            // Eliminar ítems existentes
            const itemsSnapshot = await firebase.db.collection('shopping_list_items')
                .where('shopping_list_id', '==', listId)
                .get();

            const batch = firebase.db.batch();
            itemsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Agregar nuevos ítems
            const items = parseItemsFromText(items_text);
            for (const item of items) {
                const itemData = {
                    shopping_list_id: listId,
                    item_name_raw: item.name,
                    quantity_requested: item.quantity,
                    created_at: new Date()
                };
                const newItemRef = firebase.db.collection('shopping_list_items').doc();
                batch.set(newItemRef, itemData);
            }

            // Ejecutar todas las operaciones en lote
            await batch.commit();
            console.log('Ítems de la lista actualizados', { id: listId, itemsCount: items.length });
        }

        res.json({
            success: true,
            message: 'Lista actualizada exitosamente',
            list_id: listId
        });

    } catch (error) {
        console.error('Error actualizando lista:', error);
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
                category: item.category || 'Otros',
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