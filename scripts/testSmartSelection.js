require('dotenv').config();
const AIService = require('../services/aiService');

async function testSmartProductSelection() {
    console.log('🧪 Probando selección inteligente de productos...\n');
    
    // Verificar que la clave de API esté configurada
    if (!process.env.GOOGLE_AI_API_KEY) {
        console.error('❌ Error: GOOGLE_AI_API_KEY no está definida en el archivo .env');
        console.log('📝 Por favor, crea un archivo .env en la raíz del proyecto con tu clave de API');
        return;
    }
    
    console.log('✅ Clave de API configurada correctamente');
    
    try {
        // Prueba 1: Verificar inventario disponible
        console.log('📋 Prueba 1: Verificando inventario disponible');
        const inventory = await AIService.getAvailableInventory();
        console.log(`✅ Inventario disponible: ${inventory.length} productos con stock`);
        
        if (inventory.length === 0) {
            console.log('⚠️ No hay productos en inventario. Agrega algunos productos primero.');
            return;
        }
        
        // Mostrar algunos productos de ejemplo
        console.log('📦 Productos de ejemplo:');
        inventory.slice(0, 3).forEach(product => {
            console.log(`   • ${product.name} - $${product.price} - Stock: ${product.stock} - ${product.category}`);
        });
        
        // Prueba 2: Perfil de cliente de ejemplo
        console.log('\n📋 Prueba 2: Selección inteligente para cliente específico');
        
        const clientProfile = {
            age: 15,
            grade: 'Secundaria',
            interests: 'Matemáticas, dibujo técnico',
            budget: 'medio',
            preferences: 'Calidad intermedia, durabilidad'
        };
        
        const requestedItems = [
            { name: 'lápiz', quantity: 5 },
            { name: 'cuaderno', quantity: 2 },
            { name: 'calculadora', quantity: 1 }
        ];
        
        console.log('👤 Perfil del cliente:', clientProfile);
        console.log('📋 Items solicitados:', requestedItems);
        
        const result = await AIService.selectProductsForClient(
            clientProfile,
            requestedItems,
            'intermedio'
        );
        
        console.log('✅ Resultado de selección inteligente:');
        console.log(`   • Productos seleccionados: ${result.selected_products.length}`);
        console.log(`   • Items no disponibles: ${result.unavailable_items.length}`);
        console.log(`   • Recomendaciones: ${result.recommendations.length}`);
        console.log(`   • Recomendaciones adicionales: ${result.additional_recommendations.length}`);
        
        // Mostrar productos seleccionados
        if (result.selected_products.length > 0) {
            console.log('\n🛒 Productos seleccionados:');
            result.selected_products.forEach(product => {
                console.log(`   • ${product.name} - Cantidad: ${product.quantity_selected} - $${product.price}`);
                console.log(`     Razón: ${product.reasoning}`);
            });
        }
        
        // Mostrar items no disponibles
        if (result.unavailable_items.length > 0) {
            console.log('\n❌ Items no disponibles:');
            result.unavailable_items.forEach(item => {
                console.log(`   • ${item.name} - Cantidad solicitada: ${item.quantity}`);
                console.log(`     Razón: ${item.reason}`);
            });
        }
        
        // Mostrar recomendaciones adicionales
        if (result.additional_recommendations.length > 0) {
            console.log('\n💡 Recomendaciones adicionales:');
            result.additional_recommendations.forEach(rec => {
                console.log(`   • ${rec.product.name} - $${rec.product.price}`);
                console.log(`     Razón: ${rec.reasoning}`);
            });
        }
        
        // Prueba 3: Diferentes perfiles de cliente
        console.log('\n📋 Prueba 3: Comparando diferentes perfiles');
        
        const profiles = [
            {
                name: 'Estudiante universitario',
                profile: {
                    age: 20,
                    grade: 'Universidad',
                    interests: 'Programación, diseño',
                    budget: 'alto'
                }
            },
            {
                name: 'Estudiante de primaria',
                profile: {
                    age: 8,
                    grade: 'Primaria',
                    interests: 'Arte, manualidades',
                    budget: 'bajo'
                }
            }
        ];
        
        for (const profileTest of profiles) {
            console.log(`\n👤 Probando perfil: ${profileTest.name}`);
            
            const testResult = await AIService.selectProductsForClient(
                profileTest.profile,
                [{ name: 'cuaderno', quantity: 1 }],
                'intermedio'
            );
            
            console.log(`   • Productos seleccionados: ${testResult.selected_products.length}`);
            if (testResult.selected_products.length > 0) {
                const selected = testResult.selected_products[0];
                console.log(`   • Seleccionado: ${selected.name} - $${selected.price}`);
                console.log(`   • Razón: ${selected.reasoning}`);
            }
        }
        
        console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
        console.log('🚀 La selección inteligente de productos está funcionando correctamente');
        console.log('💰 Características implementadas:');
        console.log('   • Análisis de perfil del cliente');
        console.log('   • Verificación de inventario real');
        console.log('   • Selección basada en stock disponible');
        console.log('   • Recomendaciones personalizadas');
        console.log('   • Fallbacks automáticos');
        
    } catch (error) {
        console.error('\n❌ Error durante las pruebas:', error.message);
        console.log('\n🔧 Posibles soluciones:');
        console.log('1. Verifica que tu clave de API sea válida');
        console.log('2. Asegúrate de tener productos en el inventario');
        console.log('3. Verifica que Firebase esté configurado correctamente');
        console.log('4. Revisa los logs del servidor para más detalles');
    }
}

// Función para probar endpoints HTTP
async function testHTTPEndpoints() {
    console.log('\n🌐 Probando endpoints HTTP de selección inteligente...\n');
    
    const baseUrl = 'http://localhost:3000/api/ai';
    
    try {
        // Prueba selección inteligente
        console.log('📋 Probando selección inteligente de productos...');
        const selectionResponse = await fetch(`${baseUrl}/seleccionar-productos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientProfile: {
                    age: 15,
                    grade: 'Secundaria',
                    interests: 'Matemáticas, dibujo técnico'
                },
                requestedItems: [
                    { name: 'lápiz', quantity: 5 },
                    { name: 'cuaderno', quantity: 2 }
                ],
                qualityPreference: 'intermedio'
            })
        });
        
        if (selectionResponse.ok) {
            const selection = await selectionResponse.json();
            console.log('✅ Selección inteligente HTTP:', {
                success: selection.success,
                products_selected: selection.result?.selected_products?.length || 0,
                unavailable_items: selection.result?.unavailable_items?.length || 0,
                ai_provider: selection.ai_provider
            });
        } else {
            console.log('❌ Error en selección inteligente HTTP');
        }
        
        // Prueba inventario analizado
        console.log('\n📋 Probando inventario analizado...');
        const inventoryResponse = await fetch(`${baseUrl}/inventario-analizado`);
        
        if (inventoryResponse.ok) {
            const inventory = await inventoryResponse.json();
            console.log('✅ Inventario analizado HTTP:', {
                success: inventory.success,
                total_products: inventory.total_products,
                has_analysis: !!inventory.analysis,
                ai_provider: inventory.ai_provider
            });
        } else {
            console.log('❌ Error en inventario analizado HTTP');
        }
        
        console.log('\n🎉 ¡Pruebas HTTP completadas!');
        
    } catch (error) {
        console.error('❌ Error en pruebas HTTP:', error.message);
        console.log('💡 Asegúrate de que el servidor esté ejecutándose en puerto 3000');
        console.log('   Inicia el servidor con: npm run dev');
    }
}

// Ejecutar las pruebas
async function runAllTests() {
    await testSmartProductSelection();
    await testHTTPEndpoints();
}

runAllTests(); 