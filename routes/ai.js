const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');

// NUEVA RUTA: Selección inteligente de productos para cliente específico
router.post('/seleccionar-productos', async (req, res) => {
    try {
        const { 
            clientProfile, 
            requestedItems, 
            qualityPreference = 'intermedio' 
        } = req.body;

        // Validar datos requeridos
        if (!clientProfile || !requestedItems || !Array.isArray(requestedItems)) {
            return res.status(400).json({
                success: false,
                error: 'Datos requeridos: clientProfile, requestedItems (array)'
            });
        }

        // Validar perfil del cliente
        if (!clientProfile.age && !clientProfile.grade && !clientProfile.interests) {
            return res.status(400).json({
                success: false,
                error: 'El perfil del cliente debe incluir al menos: edad, grado escolar o intereses'
            });
        }

        // Validar items solicitados
        if (requestedItems.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Debe solicitar al menos un producto'
            });
        }

        // Validar cada item
        for (const item of requestedItems) {
            if (!item.name || !item.quantity || item.quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cada item debe tener nombre y cantidad válida'
                });
            }
        }

        console.log('🤖 Iniciando selección inteligente de productos');
        console.log('👤 Perfil del cliente:', clientProfile);
        console.log('📋 Items solicitados:', requestedItems);

        // Realizar selección inteligente
        const result = await AIService.selectProductsForClient(
            clientProfile,
            requestedItems,
            qualityPreference
        );

        res.json({
            success: true,
            result: result,
            ai_provider: 'Google Generative AI (Gemini) - Optimizado',
            tokens_optimized: true,
            inventory_checked: true,
            client_profile_analyzed: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en selección inteligente:', error);
        res.status(500).json({
            success: false,
            error: 'Error procesando selección inteligente de productos'
        });
    }
});

// Ruta para obtener inventario disponible con análisis de IA
router.get('/inventario-analizado', async (req, res) => {
    try {
        const { category, minStock = 1, maxPrice } = req.query;
        
        // Obtener inventario disponible
        const inventory = await AIService.getAvailableInventory();
        
        // Filtrar por parámetros si se proporcionan
        let filteredInventory = inventory;
        
        if (category) {
            filteredInventory = filteredInventory.filter(p => 
                p.category.toLowerCase().includes(category.toLowerCase())
            );
        }
        
        if (minStock) {
            filteredInventory = filteredInventory.filter(p => p.stock >= parseInt(minStock));
        }
        
        if (maxPrice) {
            filteredInventory = filteredInventory.filter(p => p.price <= parseFloat(maxPrice));
        }

        // Analizar inventario con IA si está disponible
        const aiService = new AIService();
        let analysis = null;
        
        if (aiService.model && filteredInventory.length > 0) {
            try {
                const prompt = `Analiza estos productos de librería: ${filteredInventory.map(p => 
                    `${p.name} (${p.category}, $${p.price}, stock: ${p.stock})`
                ).join(', ')}. 

Responde: categoría_más_común|producto_más_caro|producto_más_barato|total_productos|recomendación_general.`;

                const result = await aiService.model.generateContent(prompt);
                const response = await result.response;
                const text = response.text().trim();
                
                const parts = text.split('|');
                if (parts.length >= 5) {
                    analysis = {
                        most_common_category: parts[0].trim(),
                        most_expensive: parts[1].trim(),
                        cheapest: parts[2].trim(),
                        total_products: parts[3].trim(),
                        general_recommendation: parts[4].trim()
                    };
                }
            } catch (error) {
                console.log('⚠️ Error analizando inventario con IA:', error.message);
            }
        }

        res.json({
            success: true,
            inventory: filteredInventory,
            total_products: filteredInventory.length,
            analysis: analysis,
            ai_provider: 'Google Generative AI (Gemini) - Optimizado',
            tokens_optimized: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error obteniendo inventario analizado:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo inventario analizado'
        });
    }
});

// Ruta para recomendaciones personalizadas con IA (Google Generative AI + Firebase) - OPTIMIZADA
router.post('/recomendar', async (req, res) => {
    try {
        const { lista, calidad, contexto } = req.body;
        if (!Array.isArray(lista) || lista.length === 0) {
            return res.status(400).json({ error: 'Lista vacía o formato incorrecto.' });
        }
        
        // Limitar el número de items para optimizar tokens
        const limitedList = lista.slice(0, 5); // Máximo 5 items por solicitud
        
        // Procesar cada ítem con la IA
        const recomendaciones = await Promise.all(
            limitedList.map(async (item) => {
                // Separar cantidad y nombre si es posible
                const match = item.match(/^(\d+)\s+(.*)$/);
                let cantidad = 1;
                let nombre = item;
                if (match) {
                    cantidad = parseInt(match[1], 10);
                    nombre = match[2];
                }
                
                // Usar el nuevo servicio de IA optimizado
                const sugerencia = await AIService.getAISuggestions(nombre, cantidad, calidad, contexto || '');
                return {
                    item: nombre,
                    cantidad,
                    sugerencia
                };
            })
        );
        
        res.json({ 
            recomendaciones,
            ai_provider: 'Google Generative AI (Gemini) - Optimizado',
            tokens_optimized: true,
            items_processed: limitedList.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error en recomendaciones IA:', error);
        res.status(500).json({ error: 'Error procesando recomendaciones con IA' });
    }
});

// Ruta para generar lista de compras inteligente - OPTIMIZADA
router.post('/generar-lista', async (req, res) => {
    try {
        const { tipo_lista, calidad, items_adicionales } = req.body;
        
        if (!tipo_lista) {
            return res.status(400).json({ error: 'Tipo de lista requerido.' });
        }
        
        // Limitar items adicionales para optimizar tokens
        const limitedAdditionalItems = items_adicionales ? items_adicionales.slice(0, 3) : [];
        
        const lista = await AIService.generateSmartShoppingList(
            tipo_lista, 
            calidad || 'intermedio', 
            limitedAdditionalItems
        );
        
        res.json({
            lista,
            ai_provider: 'Google Generative AI (Gemini) - Optimizado',
            tokens_optimized: true,
            additional_items_limited: limitedAdditionalItems.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error generando lista inteligente:', error);
        res.status(500).json({ error: 'Error generando lista de compras inteligente' });
    }
});

// Ruta para análisis de tendencias de compra - OPTIMIZADA
router.get('/tendencias/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ error: 'ID de usuario requerido.' });
        }
        
        const analisis = await AIService.analyzePurchaseTrends(userId);
        
        res.json({
            analisis,
            ai_provider: 'Google Generative AI (Gemini) - Optimizado',
            tokens_optimized: true,
            purchase_history_limited: 10, // Solo últimos 10 registros
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error analizando tendencias:', error);
        res.status(500).json({ error: 'Error analizando tendencias de compra' });
    }
});

// Ruta para sugerencias individuales con IA - OPTIMIZADA
router.post('/sugerir', async (req, res) => {
    try {
        const { item, cantidad, calidad, contexto } = req.body;
        
        if (!item) {
            return res.status(400).json({ error: 'Item requerido.' });
        }
        
        // Limitar contexto para optimizar tokens
        const limitedContext = contexto ? contexto.substring(0, 100) : '';
        
        const sugerencia = await AIService.getAISuggestions(
            item, 
            cantidad || 1, 
            calidad || 'cualquiera', 
            limitedContext
        );
        
        res.json({
            sugerencia,
            ai_provider: 'Google Generative AI (Gemini) - Optimizado',
            tokens_optimized: true,
            context_truncated: contexto && contexto.length > 100,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error en sugerencia individual:', error);
        res.status(500).json({ error: 'Error procesando sugerencia con IA' });
    }
});

// Ruta para procesar lista completa con IA - OPTIMIZADA
router.post('/procesar', async (req, res) => {
    try {
        const { listType, quality, additionalItems } = req.body;
        
        if (!listType) {
            return res.status(400).json({ error: 'Tipo de lista requerido.' });
        }
        
        // Limitar items adicionales para optimizar tokens
        const limitedAdditionalItems = additionalItems ? additionalItems.slice(0, 3) : [];
        
        // Generar lista inteligente
        const lista = await AIService.generateSmartShoppingList(
            listType, 
            quality || 'intermedio', 
            limitedAdditionalItems
        );
        
        // Guardar la lista en Firebase
        const firebase = require('../config/firebase');
        const listData = {
            name: lista.list_name || `Lista ${listType}`,
            items: lista.items || [],
            quality: quality || 'intermedio',
            created_at: new Date(),
            ai_generated: true,
            tokens_optimized: true,
            total_estimated_cost: lista.total_estimated_cost || 'No especificado',
            recommendations: lista.recommendations || ''
        };
        
        const result = await firebase.addDocument('shopping_lists', listData);
        
        if (result) {
            res.json({
                success: true,
                listId: result.id,
                lista,
                ai_provider: 'Google Generative AI (Gemini) - Optimizado',
                tokens_optimized: true,
                additional_items_limited: limitedAdditionalItems.length,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({ error: 'Error guardando lista en Firebase' });
        }
    } catch (error) {
        console.error('Error procesando lista con IA:', error);
        res.status(500).json({ error: 'Error procesando lista con IA' });
    }
});

// NUEVAS RUTAS PARA GESTIÓN DE CACHE

// Ruta para limpiar cache
router.post('/cache/limpiar', async (req, res) => {
    try {
        AIService.clearCache();
        res.json({
            success: true,
            message: 'Cache de IA limpiado correctamente',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error limpiando cache:', error);
        res.status(500).json({ error: 'Error limpiando cache' });
    }
});

// Ruta para obtener estadísticas del cache
router.get('/cache/stats', async (req, res) => {
    try {
        const stats = AIService.getCacheStats();
        res.json({
            cache_stats: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de cache:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas de cache' });
    }
});

// Ruta para verificar estado de la API de IA
router.get('/status', async (req, res) => {
    try {
        const stats = AIService.getCacheStats();
        const hasApiKey = !!process.env.GOOGLE_AI_API_KEY;
        
        res.json({
            status: 'operativo',
            api_key_configured: hasApiKey,
            cache_entries: stats.size,
            tokens_optimized: true,
            ai_provider: 'Google Generative AI (Gemini)',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error verificando estado:', error);
        res.status(500).json({ 
            status: 'error',
            error: 'Error verificando estado de la API de IA'
        });
    }
});

// Ruta para sugerencias en lote optimizadas (máximo 3 items)
router.post('/sugerir-lote', async (req, res) => {
    try {
        const { items } = req.body;
        
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Lista de items requerida.' });
        }
        
        // Limitar a máximo 3 items para optimizar tokens
        const limitedItems = items.slice(0, 3);
        
        const sugerencias = await Promise.all(
            limitedItems.map(async (item) => {
                const { nombre, cantidad = 1, calidad = 'cualquiera' } = item;
                const sugerencia = await AIService.getAISuggestions(nombre, cantidad, calidad);
                return {
                    item: nombre,
                    cantidad,
                    calidad,
                    sugerencia
                };
            })
        );
        
        res.json({
            sugerencias,
            ai_provider: 'Google Generative AI (Gemini) - Optimizado',
            tokens_optimized: true,
            items_processed: limitedItems.length,
            items_limited: items.length > 3,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error en sugerencias en lote:', error);
        res.status(500).json({ error: 'Error procesando sugerencias en lote' });
    }
});

module.exports = router;