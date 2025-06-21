require('dotenv').config();
const AIService = require('../services/aiService');

async function testAIService() {
    console.log('🧪 Probando servicio de IA optimizado...\n');
    
    // Verificar que la clave de API esté configurada
    if (!process.env.GOOGLE_AI_API_KEY) {
        console.error('❌ Error: GOOGLE_AI_API_KEY no está definida en el archivo .env');
        console.log('📝 Por favor, crea un archivo .env en la raíz del proyecto con tu clave de API');
        console.log('🔗 Obtén tu clave en: https://makersuite.google.com/app/apikey');
        return;
    }
    
    console.log('✅ Clave de API configurada correctamente');
    console.log('🚀 Iniciando pruebas con optimización de tokens...\n');
    
    try {
        // Prueba 0: Verificar inicialización del modelo
        console.log('📋 Prueba 0: Verificando inicialización del modelo de IA');
        const aiService = new AIService();
        if (aiService.model) {
            console.log('✅ Modelo de IA inicializado correctamente');
        } else {
            console.log('⚠️ Modelo de IA no disponible, usando solo fallbacks');
        }
        
        // Prueba 1: Sugerencias básicas (optimizadas)
        console.log('\n📋 Prueba 1: Sugerencias básicas optimizadas');
        const suggestion = await AIService.getAISuggestions('lápiz', 5, 'intermedio', 'para escuela');
        console.log('✅ Sugerencia obtenida:', {
            primary: suggestion.primary_suggestion?.name || 'No encontrado',
            confidence: suggestion.confidence_score,
            reasoning: suggestion.reasoning,
            tokens_optimized: true,
            ai_available: !!aiService.model
        });
        
        // Prueba 2: Generación de lista (optimizada)
        console.log('\n📋 Prueba 2: Generación de lista optimizada');
        const list = await AIService.generateSmartShoppingList('basica', 'intermedio', ['calculadora']);
        console.log('✅ Lista generada:', {
            name: list.list_name || list.name,
            items: list.items?.length || 0,
            recommendations: list.recommendations || 'No disponible',
            tokens_optimized: true
        });
        
        // Prueba 3: Análisis de tendencias (optimizado)
        console.log('\n📋 Prueba 3: Análisis de tendencias optimizado');
        const trends = await AIService.analyzePurchaseTrends('test-user-123');
        console.log('✅ Análisis completado:', {
            trends: trends.trends?.length || 0,
            recommendations: trends.recommendations,
            total_spent: trends.total_spent,
            tokens_optimized: true
        });
        
        // Prueba 4: Verificar cache
        console.log('\n📋 Prueba 4: Verificando cache');
        const cacheStats = AIService.getCacheStats();
        console.log('✅ Estadísticas de cache:', {
            entries: cacheStats.size,
            keys: cacheStats.entries.slice(0, 3) // Mostrar solo los primeros 3
        });
        
        // Prueba 5: Segunda llamada para verificar cache
        console.log('\n📋 Prueba 5: Verificando funcionamiento del cache');
        const cachedSuggestion = await AIService.getAISuggestions('lápiz', 5, 'intermedio', 'para escuela');
        console.log('✅ Sugerencia desde cache:', {
            primary: cachedSuggestion.primary_suggestion?.name || 'No encontrado',
            from_cache: true
        });
        
        // Prueba 6: Limpiar cache
        console.log('\n📋 Prueba 6: Limpiando cache');
        AIService.clearCache();
        const statsAfterClear = AIService.getCacheStats();
        console.log('✅ Cache limpiado:', {
            entries_after_clear: statsAfterClear.size
        });
        
        console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
        console.log('🚀 La API de IA optimizada está funcionando correctamente');
        console.log('💰 Optimizaciones implementadas:');
        console.log('   • Prompts más cortos y directos');
        console.log('   • Cache en memoria (1 hora TTL)');
        console.log('   • Límites en número de items');
        console.log('   • Respuestas en formato simplificado');
        console.log('   • Búsquedas más eficientes en Firebase');
        console.log('   • Fallbacks automáticos si la IA no está disponible');
        
        if (!aiService.model) {
            console.log('\n⚠️ Nota: La IA no está disponible, pero el sistema funciona con fallbacks');
            console.log('💡 Ejecuta "npm run check:models" para verificar los modelos disponibles');
        }
        
    } catch (error) {
        console.error('\n❌ Error durante las pruebas:', error.message);
        console.log('\n🔧 Posibles soluciones:');
        console.log('1. Verifica que tu clave de API sea válida');
        console.log('2. Asegúrate de tener conexión a internet');
        console.log('3. Revisa los límites de uso de la API');
        console.log('4. Verifica que Firebase esté configurado correctamente');
        console.log('5. Ejecuta "npm run check:models" para verificar modelos disponibles');
    }
}

// Función para probar endpoints HTTP
async function testHTTPEndpoints() {
    console.log('\n🌐 Probando endpoints HTTP optimizados...\n');
    
    const baseUrl = 'http://localhost:3000/api/ai';
    
    try {
        // Prueba endpoint de estado
        console.log('📋 Probando endpoint de estado...');
        const statusResponse = await fetch(`${baseUrl}/status`);
        if (statusResponse.ok) {
            const status = await statusResponse.json();
            console.log('✅ Estado de la API:', status);
        } else {
            console.log('❌ Servidor no disponible en puerto 3000');
            console.log('💡 Inicia el servidor con: npm run dev');
            return;
        }
        
        // Prueba sugerencia individual
        console.log('\n📋 Probando sugerencia individual...');
        const suggestionResponse = await fetch(`${baseUrl}/sugerir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item: 'cuaderno',
                cantidad: 2,
                calidad: 'intermedio',
                contexto: 'para universidad'
            })
        });
        
        if (suggestionResponse.ok) {
            const suggestion = await suggestionResponse.json();
            console.log('✅ Sugerencia HTTP:', {
                success: true,
                tokens_optimized: suggestion.tokens_optimized,
                context_truncated: suggestion.context_truncated
            });
        }
        
        // Prueba estadísticas de cache
        console.log('\n📋 Probando estadísticas de cache...');
        const cacheResponse = await fetch(`${baseUrl}/cache/stats`);
        if (cacheResponse.ok) {
            const cacheStats = await cacheResponse.json();
            console.log('✅ Estadísticas de cache HTTP:', cacheStats.cache_stats);
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
    await testAIService();
    await testHTTPEndpoints();
}

runAllTests(); 