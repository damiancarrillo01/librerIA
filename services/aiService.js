const { GoogleGenerativeAI } = require('@google/generative-ai');
const firebase = require('../config/firebase');
const db = firebase.db;

// Cache simple en memoria para reducir llamadas a la API
const suggestionCache = new Map();
const CACHE_TTL = 3600000; // 1 hora en milisegundos

class AIService {
    constructor() {
        // Inicializar Google Generative AI con la clave de API
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        // Priorizar gemini-1.5-flash como principal
        this.model = this.initializeModel();
    }

    // Inicializar modelo con fallbacks
    initializeModel() {
        const modelNames = [
            'gemini-1.5-flash', // Prioridad máxima
            'gemini-1.5-pro'   // Fallback si tienes cuota
        ];
        
        for (const modelName of modelNames) {
            try {
                const model = this.genAI.getGenerativeModel({ model: modelName });
                console.log(`✅ Modelo de IA inicializado: ${modelName}`);
                return model;
            } catch (error) {
                console.log(`⚠️ Modelo ${modelName} no disponible: ${error.message}`);
                continue;
            }
        }
        
        console.log('❌ No se pudo inicializar ningún modelo de IA');
        return null;
    }

    // Obtener productos disponibles con stock
    static async getAvailableProducts() {
        try {
            const productsRef = db.collection('products');
            const snapshot = await productsRef.get();
            
            const availableProducts = [];
            snapshot.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };
                if (product.stock > 0) {
                    availableProducts.push(product);
                }
            });

            console.log(`📦 Productos disponibles: ${availableProducts.length} productos con stock`);
            return availableProducts;
        } catch (error) {
            console.error('Error obteniendo productos:', error);
            return [];
        }
    }

    // NUEVO: Selección inteligente de productos basada en inventario real y características del cliente
    static async selectProductsForClient(clientProfile, requestedItems, qualityPreference = 'intermedio') {
        try {
            console.log('🤖 Iniciando selección inteligente de productos para cliente');
            
            // Obtener inventario real con stock
            const inventory = await AIService.getAvailableProducts();
            
            if (inventory.length === 0) {
                console.log('⚠️ No hay productos disponibles en inventario');
                return {
                    success: false,
                    message: 'No hay productos disponibles en inventario',
                    selected_products: [],
                    unavailable_items: requestedItems
                };
            }

            const aiService = new AIService();
            const selectedProducts = [];
            const unavailableItems = [];
            const recommendations = [];

            // Procesar cada item solicitado
            for (const item of requestedItems) {
                const result = await AIService.findBestProductForClient(
                    item, 
                    clientProfile, 
                    inventory, 
                    qualityPreference,
                    aiService
                );

                if (result.selected) {
                    selectedProducts.push(result.selected);
                    if (result.reasoning) {
                        recommendations.push({
                            item: item.name,
                            reasoning: result.reasoning
                        });
                    }
                } else {
                    unavailableItems.push({
                        name: item.name,
                        quantity: item.quantity,
                        reason: result.reason || 'No disponible en inventario'
                    });
                }
            }

            // Generar recomendaciones adicionales basadas en el perfil del cliente
            const additionalRecommendations = await AIService.generateAdditionalRecommendations(
                clientProfile, 
                inventory, 
                selectedProducts,
                aiService
            );

            return {
                success: true,
                selected_products: selectedProducts,
                unavailable_items: unavailableItems,
                recommendations: recommendations,
                additional_recommendations: additionalRecommendations,
                client_profile_analyzed: true,
                inventory_checked: true
            };

        } catch (error) {
            console.error('Error en selección inteligente:', error);
            return {
                success: false,
                message: 'Error en selección de productos',
                selected_products: [],
                unavailable_items: requestedItems
            };
        }
    }

    // Encontrar el mejor producto para un cliente específico
    static async findBestProductForClient(item, clientProfile, inventory, qualityPreference, aiService) {
        try {
            // 1. Puntuación y filtrado inteligente de productos
            const scoredProducts = inventory.map(product => {
                const score = AIService.calculateMatchScore(item.name, product.name);
                return { ...product, score };
            }).filter(p => p.score > 0.4) // UMBRAL AUMENTADO A 0.4 PARA SER MÁS ESTRICTO
              .sort((a, b) => b.score - a.score);

            // REGLA CLAVE: Si no hay NINGÚN producto con puntuación decente, se rechaza de inmediato.
            if (scoredProducts.length === 0) {
                return {
                    selected: null,
                    reason: `No se encontraron productos que coincidan claramente con "${item.name}".`
                };
            }

            // 2. Filtrar por stock disponible
            const availableProducts = scoredProducts.filter(product => product.stock >= item.quantity);

            if (availableProducts.length === 0) {
                const bestMatch = scoredProducts[0];
                return {
                    selected: null,
                    reason: `Stock insuficiente para "${bestMatch.name}". Se necesitan ${item.quantity} pero solo hay ${bestMatch.stock}.`
                };
            }

            // 3. Selección final (con IA o por reglas)
            // Tomamos solo los 5 mejores candidatos para no sobrecargar a la IA
            const topCandidates = availableProducts.slice(0, 5);

            if (aiService.model) {
                return await AIService.selectBestProductWithAI(
                    item, 
                    clientProfile, 
                    topCandidates, 
                    qualityPreference,
                    aiService
                );
            } else {
                return AIService.selectBestProductWithRules(item, clientProfile, topCandidates, qualityPreference);
            }

        } catch (error) {
            console.error('Error encontrando mejor producto:', error);
            return {
                selected: null,
                reason: 'Error interno en la selección de producto.'
            };
        }
    }

    // NUEVO: Calcula la puntuación de coincidencia entre dos nombres de producto
    static calculateMatchScore(requestedName, inventoryName) {
        const req = requestedName.toLowerCase().split(' ');
        const inv = inventoryName.toLowerCase().split(' ');

        // Coincidencia exacta de palabras clave
        const commonWords = req.filter(word => inv.includes(word));
        let score = commonWords.length / req.length;

        // Bonificación por secuencia (si las palabras aparecen en el mismo orden)
        const reqStr = req.join(' ');
        if (reqStr.includes(inv.join(' '))) {
            score += 0.2;
        }
        if (inv.join(' ').includes(reqStr)) {
            score += 0.2;
        }

        return Math.min(score, 1.0); // Normalizar a 1.0
    }

    // Selección inteligente con IA
    static async selectBestProductWithAI(item, clientProfile, availableProducts, qualityPreference, aiService) {
        try {
            // Crear prompt optimizado para selección
            const productsInfo = availableProducts.map(p => 
                `ID: ${p.id}, Nombre: ${p.name}, Precio: ${p.price}, Stock: ${p.stock}, Categoría: ${p.category}, Marca: ${p.brand || 'N/A'}`
            ).join('\n');

            const prompt = `Analiza la siguiente solicitud de un cliente y selecciona el producto más adecuado del inventario.

### Perfil del Cliente:
- **Descripción:** ${clientProfile.description || 'No especificada.'}
- **Preferencia de Calidad:** ${qualityPreference}

### Producto Solicitado:
- **Nombre:** "${item.name}"
- **Cantidad Necesaria:** ${item.quantity}

### Inventario Disponible para "${item.name}":
${productsInfo.length > 0 ? productsInfo : 'No hay productos que coincidan directamente.'}

### Instrucciones:
1.  **Evalúa el perfil del cliente:** Considera sus características y presupuesto (calidad).
2.  **Compara con el inventario:** Elige el producto del inventario que MEJOR cumpla con lo que el cliente necesita.
3.  **Formato de respuesta OBLIGATORIO:** Responde únicamente con el ID del producto seleccionado y una breve razón, separados por un pipe (|).
    -   **Formato Correcto:** ID_DEL_PRODUCTO|Razón de la selección.
    -   **Ejemplo:** 8a7d-4f5b|Es la mejor opción económica y cumple con la calidad solicitada.
4.  **REGLA CRÍTICA:** Si NINGÚN producto del inventario es una buena opción, responde "NULL|No hay una opción adecuada."

Tu única respuesta debe seguir este formato.`;

            const result = await aiService.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();

            const parts = text.split('|');
            if (parts.length >= 2) {
                const selectedId = parts[0].trim();
                const reasoning = parts[1].trim();

                if (selectedId === 'NULL') {
                    return AIService.selectBestProductWithRules(item, clientProfile, availableProducts, qualityPreference);
                }

                const selectedProduct = availableProducts.find(p => p.id === selectedId);
                if (selectedProduct) {
                    return {
                        selected: {
                            ...selectedProduct,
                            quantity_selected: Math.min(item.quantity, selectedProduct.stock),
                            reasoning: reasoning
                        },
                        reasoning: reasoning
                    };
                }
            }

            // Fallback si la IA no responde correctamente
            return AIService.selectBestProductWithRules(item, clientProfile, availableProducts, qualityPreference);

        } catch (error) {
            console.error('Error en selección con IA:', error);
            return AIService.selectBestProductWithRules(item, clientProfile, availableProducts, qualityPreference);
        }
    }

    // Selección basada en reglas (fallback)
    static selectBestProductWithRules(item, clientProfile, availableProducts, qualityPreference) {
        // Ordenar por precio (menor a mayor) y stock disponible
        const sortedProducts = availableProducts.sort((a, b) => {
            // Priorizar stock suficiente
            if (a.stock >= item.quantity && b.stock < item.quantity) return -1;
            if (a.stock < item.quantity && b.stock >= item.quantity) return 1;
            
            // Luego por precio
            return a.price - b.price;
        });

        const selectedProduct = sortedProducts[0];
        
        return {
            selected: {
                ...selectedProduct,
                quantity_selected: Math.min(item.quantity, selectedProduct.stock),
                reasoning: `Seleccionado por disponibilidad y precio (${selectedProduct.price})`
            },
            reasoning: `Producto seleccionado automáticamente: ${selectedProduct.name}`
        };
    }

    // Generar recomendaciones adicionales basadas en el perfil del cliente
    static async generateAdditionalRecommendations(clientProfile, inventory, selectedProducts, aiService) {
        try {
            if (!aiService.model) {
                return [];
            }

            // Obtener categorías de productos ya seleccionados
            const selectedCategories = selectedProducts.map(p => p.category);
            
            // Encontrar productos complementarios
            const complementaryProducts = inventory.filter(product => 
                !selectedCategories.includes(product.category) && 
                product.stock > 0
            );

            if (complementaryProducts.length === 0) {
                return [];
            }

            const prompt = `Cliente: ${clientProfile.age || 'N/A'} años, ${clientProfile.grade || 'N/A'}, ${clientProfile.interests || 'N/A'}.
Ya seleccionó: ${selectedProducts.map(p => p.name).join(', ')}.

Sugiere 2-3 productos adicionales útiles. Responde: nombre|razón (uno por línea).`;

            const result = await aiService.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();

            const recommendations = [];
            const lines = text.split('\n').filter(line => line.trim());
            
            for (const line of lines.slice(0, 3)) {
                const parts = line.split('|');
                if (parts.length >= 2) {
                    const productName = parts[0].trim();
                    const reasoning = parts[1].trim();
                    
                    // Buscar el producto en inventario
                    const product = complementaryProducts.find(p => 
                        p.name.toLowerCase().includes(productName.toLowerCase())
                    );
                    
                    if (product) {
                        recommendations.push({
                            product: product,
                            reasoning: reasoning
                        });
                    }
                }
            }

            return recommendations;

        } catch (error) {
            console.error('Error generando recomendaciones adicionales:', error);
            return [];
        }
    }

    // Método principal para obtener sugerencias de IA (optimizado)
    static async getAISuggestions(itemName, quantity, qualityPreference = 'cualquiera', context = '') {
        try {
            // Verificar cache primero
            const cacheKey = `${itemName}-${quantity}-${qualityPreference}-${context}`;
            const cached = suggestionCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
                console.log('✅ Usando sugerencia desde cache');
                return cached.data;
            }

            const aiService = new AIService();
            
            // Verificar si el modelo está disponible
            if (!aiService.model) {
                console.log('⚠️ Modelo de IA no disponible, usando fallback');
                return await AIService.simulateAiSuggestions(itemName, quantity, qualityPreference);
            }
            
            // Prompt optimizado - más corto y directo
            const prompt = aiService.buildOptimizedPrompt(itemName, quantity, qualityPreference, context);
            
            // Obtener respuesta de la IA
            const aiResponse = await aiService.generateResponse(prompt);
            
            // Buscar productos en Firebase que coincidan con las sugerencias
            const suggestions = await aiService.matchProductsWithAI(aiResponse, itemName, qualityPreference);
            
            // Guardar en cache
            suggestionCache.set(cacheKey, {
                data: suggestions,
                timestamp: Date.now()
            });
            
            return suggestions;
        } catch (error) {
            console.error('Error en getAISuggestions:', error);
            // Fallback a la simulación local si la IA falla
            return await AIService.simulateAiSuggestions(itemName, quantity, qualityPreference);
        }
    }

    // Prompt optimizado - más corto y eficiente
    buildOptimizedPrompt(itemName, quantity, qualityPreference, context) {
        const contextPart = context ? `Contexto: ${context}.` : '';
        const qualityPart = qualityPreference !== 'cualquiera' ? `Calidad: ${qualityPreference}.` : '';
        
        return `Sugiere producto para: "${itemName}" (${quantity} unidades). ${qualityPart} ${contextPart} Responde solo: nombre|descripción|marca|categoría|precio_estimado|razón.`;
    }

    // Generar respuesta usando la API de Google Generative AI (optimizado con mejor manejo de errores)
    async generateResponse(prompt) {
        try {
            if (!this.model) {
                throw new Error('Modelo de IA no disponible');
            }

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();
            
            // Parsear respuesta optimizada
            const parts = text.split('|');
            if (parts.length >= 6) {
                return {
                    product_name: parts[0].trim(),
                    description: parts[1].trim(),
                    brand: parts[2].trim(),
                    category: parts[3].trim(),
                    price_range: parts[4].trim(),
                    reasoning: parts[5].trim()
                };
            } else {
                // Fallback si el formato no es correcto
                return {
                    product_name: text,
                    description: text,
                    brand: '',
                    category: 'General',
                    price_range: '',
                    reasoning: text
                };
            }
        } catch (error) {
            console.error('Error generando respuesta de IA:', error.message);
            // Retornar respuesta de fallback
            return {
                product_name: 'Producto sugerido',
                description: 'Descripción no disponible',
                brand: '',
                category: 'General',
                price_range: 'Variable',
                reasoning: 'Sugerencia generada localmente'
            };
        }
    }

    // Buscar productos en Firebase que coincidan con las sugerencias de IA (optimizado)
    async matchProductsWithAI(aiResponse, originalItemName, qualityPreference) {
        try {
            // Búsqueda más eficiente - solo términos clave
            const searchTerms = [
                aiResponse.product_name,
                originalItemName,
                aiResponse.brand
            ].filter(term => term && term.trim() && term.length > 2);

            let productsRef = db.collection('products');
            let snapshot = await productsRef.get();
            let products = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                const productText = `${data.name || ''} ${data.brand || ''}`.toLowerCase();
                
                // Búsqueda más eficiente
                const matches = searchTerms.some(term => 
                    productText.includes(term.toLowerCase())
                );

                if (matches) {
                    products.push({ id: doc.id, ...data });
                }
            });

            // Si no hay coincidencias, búsqueda más amplia pero limitada
            if (products.length === 0) {
                const searchTerm = originalItemName.toLowerCase();
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.name && data.name.toLowerCase().includes(searchTerm)) {
                        products.push({ id: doc.id, ...data });
                    }
                });
            }

            // Limitar resultados para optimizar
            products = products.slice(0, 5);

            // Filtrar por calidad si corresponde
            if (qualityPreference !== 'cualquiera' && products.length > 0) {
                const filteredProducts = products.filter(product => 
                    product.quality_category === qualityPreference
                );
                if (filteredProducts.length > 0) {
                    products = filteredProducts;
                }
            }

            // Ordenar por stock y precio
            products.sort((a, b) => {
                if ((a.stock || 0) > 0 && (b.stock || 0) === 0) return -1;
                if ((a.stock || 0) === 0 && (b.stock || 0) > 0) return 1;
                return (a.price || 0) - (b.price || 0);
            });

            const primarySuggestion = products.length > 0 ? products[0] : null;
            const alternativeSuggestions = products.slice(1, 3); // Reducido de 4 a 3

            return {
                primary_suggestion: primarySuggestion,
                alternative_suggestions: alternativeSuggestions,
                confidence_score: products.length > 0 ? 0.9 : 0.3,
                reasoning: aiResponse.reasoning || `Sugerencia para "${originalItemName}"`,
                ai_insights: aiResponse
            };
        } catch (error) {
            console.error('Error buscando productos en Firebase:', error);
            throw error;
        }
    }

    // Generar lista de compras inteligente (optimizado)
    static async generateSmartShoppingList(listType, quality = 'intermedio', additionalItems = []) {
        try {
            // Cache para listas estándar
            const cacheKey = `list-${listType}-${quality}-${additionalItems.join(',')}`;
            const cached = suggestionCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
                console.log('✅ Usando lista desde cache');
                return cached.data;
            }

            const aiService = new AIService();
            
            // Prompt optimizado para listas
            const additionalItemsText = additionalItems.length > 0 ? `Items extra: ${additionalItems.join(', ')}.` : '';
            const prompt = `Lista ${listType}, calidad ${quality}. ${additionalItemsText} Formato: nombre|cantidad|categoría|prioridad. Máximo 8 items.`;
            
            const result = await aiService.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            try {
                // Parsear respuesta optimizada
                const lines = text.trim().split('\n').filter(line => line.trim());
                const items = lines.slice(0, 8).map(line => {
                    const parts = line.split('|');
                    return {
                        name: parts[0]?.trim() || 'Producto',
                        quantity: parseInt(parts[1]) || 1,
                        category: parts[2]?.trim() || 'General',
                        priority: parts[3]?.trim() || 'media'
                    };
                });

                const list = {
                    list_name: `Lista ${listType} Inteligente`,
                    items: items,
                    total_estimated_cost: 'Variable',
                    recommendations: 'Lista generada con IA'
                };

                // Guardar en cache
                suggestionCache.set(cacheKey, {
                    data: list,
                    timestamp: Date.now()
                });

                return list;
            } catch (parseError) {
                console.log('Respuesta de IA no es parseable, usando lista estándar');
                return AIService.getStandardLists()[listType] || AIService.getStandardLists().basica;
            }
        } catch (error) {
            console.error('Error generando lista inteligente:', error);
            // Fallback a listas estándar
            return AIService.getStandardLists()[listType] || AIService.getStandardLists().basica;
        }
    }

    // Análisis de tendencias de compra (optimizado)
    static async analyzePurchaseTrends(userId) {
        try {
            // Cache para análisis de tendencias
            const cacheKey = `trends-${userId}`;
            const cached = suggestionCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
                console.log('✅ Usando análisis desde cache');
                return cached.data;
            }

            const aiService = new AIService();
            
            // Obtener historial de compras del usuario (limitado)
            const purchasesRef = db.collection('purchases').where('userId', '==', userId).limit(10);
            const snapshot = await purchasesRef.get();
            
            const purchases = [];
            snapshot.forEach(doc => {
                purchases.push({ id: doc.id, ...doc.data() });
            });

            if (purchases.length === 0) {
                return {
                    trends: [],
                    recommendations: "No hay historial de compras para analizar",
                    total_spent: 0
                };
            }

            // Prompt optimizado para análisis
            const purchaseSummary = purchases.map(p => `${p.total || 0}`).join(',');
            const prompt = `Analiza gastos: ${purchaseSummary}. Responde: tendencia|recomendación|total.`;

            const result = await aiService.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            try {
                const parts = text.split('|');
                const analysis = {
                    trends: [parts[0]?.trim() || "Análisis no disponible"],
                    recommendations: parts[1]?.trim() || "Revisa productos similares",
                    total_spent: purchases.reduce((sum, purchase) => sum + (purchase.total || 0), 0)
                };

                // Guardar en cache
                suggestionCache.set(cacheKey, {
                    data: analysis,
                    timestamp: Date.now()
                });

                return analysis;
            } catch (parseError) {
                return {
                    trends: ["Análisis no disponible"],
                    recommendations: "Considera revisar productos similares a los que has comprado antes",
                    total_spent: purchases.reduce((sum, purchase) => sum + (purchase.total || 0), 0)
                };
            }
        } catch (error) {
            console.error('Error analizando tendencias:', error);
            return {
                trends: [],
                recommendations: "Error al analizar tendencias",
                total_spent: 0
            };
        }
    }

    // Limpiar cache (método utilitario)
    static clearCache() {
        suggestionCache.clear();
        console.log('✅ Cache de IA limpiado');
    }

    // Obtener estadísticas de cache
    static getCacheStats() {
        return {
            size: suggestionCache.size,
            entries: Array.from(suggestionCache.keys())
        };
    }

    // Sugerencias de IA usando Firebase (método de fallback optimizado)
    static async simulateAiSuggestions(itemName, quantity, qualityPreference = 'cualquiera') {
        try {
            const searchTerm = itemName.toLowerCase();
            let productsRef = db.collection('products');
            let snapshot = await productsRef.get();
            let products = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.name && data.name.toLowerCase().includes(searchTerm)) {
                    products.push({ id: doc.id, ...data });
                }
            });

            if (products.length === 0) {
                return {
                    primary_suggestion: null,
                    alternative_suggestions: [],
                    confidence_score: 0.0,
                    reasoning: `No se encontraron productos que coincidan con "${itemName}" en Firebase.`
                };
            }

            let filteredProducts = products;
            if (qualityPreference !== 'cualquiera') {
                filteredProducts = products.filter(product => 
                    product.quality_category === qualityPreference
                );
                if (filteredProducts.length === 0) {
                    filteredProducts = products;
                }
            }

            // Limitar resultados para optimizar
            filteredProducts = filteredProducts.slice(0, 4);
            filteredProducts.sort((a, b) => {
                if ((a.stock || 0) > 0 && (b.stock || 0) === 0) return -1;
                if ((a.stock || 0) === 0 && (b.stock || 0) > 0) return 1;
                return (a.price || 0) - (b.price || 0);
            });

            const primarySuggestion = filteredProducts[0];
            const alternativeSuggestions = filteredProducts.slice(1, 3);

            return {
                primary_suggestion: primarySuggestion,
                alternative_suggestions: alternativeSuggestions,
                confidence_score: 1.0,
                reasoning: `Sugerencia generada usando Firebase para "${itemName}".`
            };
        } catch (error) {
            console.error('Error en simulación de IA (Firebase):', error);
            return {
                primary_suggestion: null,
                alternative_suggestions: [],
                confidence_score: 0.0,
                reasoning: 'Error al procesar la solicitud con Firebase.'
            };
        }
    }

    // Listas estándar predefinidas (sin cambios - ya optimizadas)
    static getStandardLists() {
        return {
            basica: {
                name: 'Lista Básica Escolar',
                items: [
                    { name: 'Cuaderno universitario 100 hojas', quantity: 5, category: 'Papelería' },
                    { name: 'Lápiz grafito HB', quantity: 10, category: 'Escritura' },
                    { name: 'Goma de borrar blanca', quantity: 3, category: 'Escritura' },
                    { name: 'Sacapuntas metálico', quantity: 2, category: 'Escritura' },
                    { name: 'Regla de 30cm', quantity: 1, category: 'Geometría' },
                    { name: 'Tijeras escolares', quantity: 1, category: 'Manualidades' },
                    { name: 'Mochila escolar', quantity: 1, category: 'Organización' },
                    { name: 'Estuche para lápices', quantity: 1, category: 'Organización' }
                ]
            },
            media: {
                name: 'Lista Educación Media',
                items: [
                    { name: 'Cuaderno universitario 100 hojas', quantity: 8, category: 'Papelería' },
                    { name: 'Lápiz grafito HB', quantity: 15, category: 'Escritura' },
                    { name: 'Bolígrafo azul', quantity: 8, category: 'Escritura' },
                    { name: 'Bolígrafo rojo', quantity: 3, category: 'Escritura' },
                    { name: 'Bolígrafo negro', quantity: 5, category: 'Escritura' },
                    { name: 'Resaltador amarillo', quantity: 2, category: 'Escritura' },
                    { name: 'Calculadora científica', quantity: 1, category: 'Matemáticas' },
                    { name: 'Compás de dibujo', quantity: 1, category: 'Geometría' },
                    { name: 'Transportador 180°', quantity: 1, category: 'Geometría' },
                    { name: 'Escuadra 45°', quantity: 1, category: 'Geometría' },
                    { name: 'Cartulina blanca', quantity: 5, category: 'Arte' },
                    { name: 'Pegamento en barra', quantity: 2, category: 'Manualidades' }
                ]
            },
            universidad: {
                name: 'Lista Universitaria',
                items: [
                    { name: 'Cuaderno universitario 100 hojas', quantity: 10, category: 'Papelería' },
                    { name: 'Bolígrafo azul', quantity: 12, category: 'Escritura' },
                    { name: 'Bolígrafo negro', quantity: 8, category: 'Escritura' },
                    { name: 'Bolígrafo rojo', quantity: 3, category: 'Escritura' },
                    { name: 'Resaltador amarillo', quantity: 4, category: 'Escritura' },
                    { name: 'Resaltador verde', quantity: 2, category: 'Escritura' },
                    { name: 'Resaltador rosa', quantity: 2, category: 'Escritura' },
                    { name: 'Calculadora científica avanzada', quantity: 1, category: 'Matemáticas' },
                    { name: 'USB 32GB', quantity: 2, category: 'Tecnología' },
                    { name: 'Carpeta organizadora', quantity: 3, category: 'Organización' },
                    { name: 'Separadores de índice', quantity: 2, category: 'Organización' },
                    { name: 'Post-it adhesivos', quantity: 3, category: 'Organización' },
                    { name: 'Mochila universitaria', quantity: 1, category: 'Organización' },
                    { name: 'Laptop stand', quantity: 1, category: 'Tecnología' }
                ]
            },
            preescolar: {
                name: 'Lista Preescolar',
                items: [
                    { name: 'Cuaderno de dibujo', quantity: 3, category: 'Arte' },
                    { name: 'Lápices de colores', quantity: 1, category: 'Arte' },
                    { name: 'Tijeras escolares', quantity: 1, category: 'Manualidades' },
                    { name: 'Pegamento en barra', quantity: 2, category: 'Manualidades' },
                    { name: 'Plastilina', quantity: 1, category: 'Arte' },
                    { name: 'Mochila preescolar', quantity: 1, category: 'Organización' }
                ]
            },
            tecnico: {
                name: 'Lista Técnica',
                items: [
                    { name: 'Cuaderno técnico', quantity: 6, category: 'Papelería' },
                    { name: 'Lápiz técnico', quantity: 5, category: 'Escritura' },
                    { name: 'Escuadra', quantity: 1, category: 'Geometría' },
                    { name: 'Cartabón', quantity: 1, category: 'Geometría' },
                    { name: 'Calculadora científica', quantity: 1, category: 'Matemáticas' },
                    { name: 'Compás técnico', quantity: 1, category: 'Geometría' }
                ]
            }
        };
    }

    // NUEVO: El único punto de entrada para procesar una lista.
    static async processShoppingList(requestedItems, clientProfile, qualityPreference) {
        const allProducts = await this.getAvailableProducts();
        let addedItems = [];
        let notFoundItems = [];

        // Usamos un bucle for...of para poder usar await dentro de él.
        for (const item of requestedItems) {
            // Paso 1: Búsqueda estricta de candidatos.
            const candidates = this.findStrictCandidates(item, allProducts);

            if (candidates.length === 0) {
                // Si no hay candidatos, el producto no se encontró. Fin de la historia para este ítem.
                notFoundItems.push({ name: item.name, reason: "No se encontró ningún producto con ese nombre en el inventario." });
                continue;
            }

            // Paso 2: Selección con IA a partir de una lista de buenos candidatos.
            const aiService = new AIService();
            const selection = await aiService.selectBestCandidateWithAI(item, candidates, clientProfile, qualityPreference);

            if (selection.product) {
                // Se encontró y seleccionó un producto.
                // Asegurar que el producto tenga un campo category
                const productWithCategory = {
                    ...selection.product,
                    category: selection.product.category || 'Otros'
                };
                addedItems.push(productWithCategory);
            } else {
                // La IA no consideró ningún candidato adecuado.
                notFoundItems.push({ name: item.name, reason: selection.reason });
            }
        }
        
        return { success: true, added_items: addedItems, not_found_items: notFoundItems };
    }
    
    // NUEVO: Normaliza texto para búsquedas (quita acentos, a minúsculas).
    static normalizeText(text) {
        return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // NUEVO: El nuevo filtro estricto.
    static findStrictCandidates(item, allProducts) {
        const requestedWords = this.normalizeText(item.name).split(' ');

        return allProducts
            .filter(p => {
                // Solo considerar productos con stock suficiente.
                if (p.stock < item.quantity) return false;
                
                const productWords = this.normalizeText(p.name);
                // TODAS las palabras solicitadas deben estar en el nombre del producto.
                return requestedWords.every(word => productWords.includes(word));
            });
    }

    // NUEVO: La IA solo elige de una lista curada.
    async selectBestCandidateWithAI(item, candidates, clientProfile, qualityPreference) {
        // Si solo hay un candidato, no necesitamos a la IA. Lo elegimos directamente.
        if (candidates.length === 1) {
            const product = candidates[0];
            return {
                product: {
                    ...product,
                    quantity_requested: item.quantity,
                    category: product.category || 'Otros',
                    reasoning: 'Única opción disponible que coincide con la solicitud.'
                }
            };
        }

        try {
            const productsInfo = candidates.map(p => 
                `ID: ${p.id}, Nombre: ${p.name}, Precio: ${p.price}, Marca: ${p.brand || 'N/A'}`
            ).join('\n');

            const prompt = `Un cliente con el perfil "${clientProfile.description || 'No especificado'}" y preferencia de calidad "${qualityPreference}" necesita "${item.quantity} x ${item.name}". De la siguiente lista de productos disponibles, ¿cuál es la MEJOR opción?

Inventario de Candidatos:
${productsInfo}

Responde SOLO con el ID del producto elegido. Si ninguna opción es claramente superior o adecuada, responde "NULL".`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const selectedId = response.text().trim();

            if (selectedId && selectedId !== 'NULL') {
                const selectedProduct = candidates.find(p => p.id === selectedId);
                if (selectedProduct) {
                    return { 
                        product: { 
                            ...selectedProduct, 
                            quantity_requested: item.quantity,
                            category: selectedProduct.category || 'Otros',
                            reasoning: 'Seleccionado por IA como la mejor opción.'
                        } 
                    };
                }
            }

            // Fallback: si la IA dice NULL o falla, elegimos el más barato.
            const cheapest = candidates.sort((a,b) => a.price - b.price)[0];
            return {
                product: {
                    ...cheapest,
                    quantity_requested: item.quantity,
                    category: cheapest.category || 'Otros',
                    reasoning: 'Opción más económica seleccionada por defecto.'
                }
            };

        } catch (error) {
            console.error("Error en la selección con IA, eligiendo el más barato.", error);
            const cheapest = candidates.sort((a,b) => a.price - b.price)[0];
            return {
                product: {
                    ...cheapest,
                    quantity_requested: item.quantity,
                    category: cheapest.category || 'Otros',
                    reasoning: 'Opción más económica por fallo de la IA.'
                }
            };
        }
    }

    // NUEVO: Usa IA para extraer la esencia de un producto
    static async getProductEssence(productName) {
        try {
            const aiService = new AIService();
            if (!aiService.model) {
                console.log('🤖 Modelo de IA no disponible, usando reglas para obtener esencia.');
                return AIService.getProductEssenceWithRules(productName);
            }

            const prompt = `De la siguiente frase, extrae el sustantivo o idea principal que define al objeto. Responde únicamente con esa palabra o frase corta en minúsculas y singular.
            Ejemplos:
            - "Mochila Escolar Premium con Ruedas" -> "mochila"
            - "Caja de 12 Lápices de Colores" -> "lápiz de color"
            - "Goma de borrar blanca suave" -> "goma de borrar"
            - "Cuaderno universitario 100 hojas" -> "cuaderno"

            Frase: "${productName}"
            
            Respuesta:`;
            
            const result = await aiService.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim().toLowerCase();
            
            // Pequeña limpieza de la respuesta de la IA
            return text.replace(/[\n."]/g, '');

    } catch (error) {
            console.error("Error obteniendo esencia del producto con IA:", error);
            // Si la IA falla, usamos el método de reglas como fallback.
            return AIService.getProductEssenceWithRules(productName);
        }
    }

    // NUEVO: Fallback con reglas para obtener la esencia de un producto
    static getProductEssenceWithRules(productName) {
        const productEssenceList = [
            'goma de borrar', 'lápices de colores', 'bolígrafo', 'cuaderno', 'lápiz', 'mochila', 'regla', 
            'tijeras', 'calculadora', 'compás', 'transportador', 'escuadra', 
            'cartulina', 'pegamento', 'sacapuntas', 'resaltador', 'marcador', 
            'estuche', 'carpeta', 'papel', 'pincel', 'acuarela',
            'pendrive', 'mouse', 'teclado', 'audífonos', 'goma', 'lapiz', 'boligrafo', 'agenda'
        ].sort((a, b) => b.length - a.length);

        const lowerCaseName = productName.toLowerCase();

        for (const term of productEssenceList) {
            if (lowerCaseName.includes(term)) {
                return term;
            }
        }
        return ''; // No se encontró
    }
}

module.exports = AIService;