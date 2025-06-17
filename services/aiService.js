const firebase = require('../config/firebase');
const db = firebase.db;

class AIService {
    // Sugerencias de IA usando Firebase
    static async simulateAiSuggestions(itemName, quantity, qualityPreference = 'cualquiera') {
        try {
            const searchTerm = itemName.toLowerCase();
            // Buscar productos en Firebase (colección 'products')
            let productsRef = db.collection('products');
            let snapshot = await productsRef.get();
            let products = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Coincidencia por nombre o descripción
                if (
                    (data.name && data.name.toLowerCase().includes(searchTerm)) ||
                    (data.description && data.description.toLowerCase().includes(searchTerm))
                ) {
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

            // Filtrar por calidad si corresponde
            let filteredProducts = products;
            if (qualityPreference !== 'cualquiera') {
                filteredProducts = products.filter(product => 
                    product.quality_category === qualityPreference
                );
                if (filteredProducts.length === 0) {
                    filteredProducts = products;
                }
            }

            // Ordenar por stock y precio
            filteredProducts.sort((a, b) => {
                if ((a.stock || 0) > 0 && (b.stock || 0) === 0) return -1;
                if ((a.stock || 0) === 0 && (b.stock || 0) > 0) return 1;
                return (a.price || 0) - (b.price || 0);
            });

            const primarySuggestion = filteredProducts[0];
            const alternativeSuggestions = filteredProducts.slice(1, 4);

            // Calcular score de confianza (simple)
            const confidenceScore = 1.0; // Puedes mejorar esto si quieres

            return {
                primary_suggestion: primarySuggestion,
                alternative_suggestions: alternativeSuggestions,
                confidence_score: confidenceScore,
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

    // Crear o obtener producto (replica _get_or_create_product de Django)
    static async getOrCreateProduct(productData) {
        try {
            // Buscar producto existente
            let product = await Product.findOne({
                name: productData.name,
                brand: productData.brand
            });

            if (!product) {
                // Crear nuevo producto
                product = new Product({
                    name: productData.name,
                    description: productData.description,
                    price: productData.price,
                    brand: productData.brand,
                    quality_category: productData.quality_category,
                    stock: productData.stock || 0
                });
                await product.save();
                console.log(`✅ Producto creado: ${product.name}`);
            }

            return product;
        } catch (error) {
            console.error('Error creando/obteniendo producto:', error);
            throw error;
        }
    }

    // Listas estándar predefinidas
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
                    { name: 'Cuaderno de dibujo', quantity: 3 },
                    { name: 'Lápices de colores', quantity: 1 },
                    { name: 'Tijeras escolares', quantity: 1 },
                    { name: 'Pegamento en barra', quantity: 2 },
                    { name: 'Plastilina', quantity: 1 },
                    { name: 'Mochila preescolar', quantity: 1 }
                ]
            },
            tecnico: {
                name: 'Lista Técnica',
                items: [
                    { name: 'Cuaderno técnico', quantity: 6 },
                    { name: 'Lápiz técnico', quantity: 5 },
                    { name: 'Escuadra', quantity: 1 },
                    { name: 'Cartabón', quantity: 1 },
                    { name: 'Calculadora científica', quantity: 1 },
                    { name: 'Compás técnico', quantity: 1 }
                ]
            }
        };
    }
}

// Añadir después de las funciones existentes
async function processWithAI() {
    try {
        document.body.style.cursor = 'wait';
        const response = await fetch('/api/ai/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                listType: selectedListType,
                quality: document.querySelector('[name="quality"]:checked')?.value || 'intermedio'
            })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                window.location.href = `/list/${result.listId}`;
            } else {
                throw new Error(result.message || 'Error procesando con IA');
            }
        } else {
            throw new Error('Error en la respuesta del servidor');
        }
    } catch (error) {
        console.error('Error procesando con IA:', error);
        alert('Error al procesar con IA: ' + error.message);
    } finally {
        document.body.style.cursor = 'default';
        qualityModal.hide();
    }
}

// Modificar la función selectQuality para incluir procesamiento IA
async function selectQuality(quality) {
    console.log('Seleccionando calidad:', quality);
    
    try {
        document.body.style.cursor = 'wait';
        
        const response = await fetch(`/api/shopping/standard/${selectedListType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                quality_preference: quality,
                useAI: true // Agregamos este flag para indicar que queremos usar IA
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            window.location.href = `/list/${result.list_id}`;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error creando lista estándar');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    } finally {
        document.body.style.cursor = 'default';
        qualityModal.hide();
    }
}

module.exports = AIService;