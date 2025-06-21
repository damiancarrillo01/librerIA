require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function checkAvailableModels() {
    console.log('🔍 Verificando modelos disponibles en Google Generative AI...\n');
    
    // Verificar que la clave de API esté configurada
    if (!process.env.GOOGLE_AI_API_KEY) {
        console.error('❌ Error: GOOGLE_AI_API_KEY no está definida en el archivo .env');
        console.log('📝 Por favor, crea un archivo .env en la raíz del proyecto con tu clave de API');
        console.log('🔗 Obtén tu clave en: https://makersuite.google.com/app/apikey');
        return;
    }
    
    console.log('✅ Clave de API configurada correctamente');
    
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        
        // Probar diferentes modelos directamente
        const testModels = [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-pro',
            'gemini-pro-vision'
        ];
        
        console.log('🧪 Probando modelos específicos...\n');
        
        let workingModel = null;
        
        for (const modelName of testModels) {
            try {
                console.log(`📋 Probando modelo: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                
                // Hacer una prueba simple
                const result = await model.generateContent('Responde solo: OK');
                const response = await result.response;
                const text = response.text();
                
                console.log(`✅ ${modelName}: Funcionando correctamente`);
                console.log(`   Respuesta: "${text}"`);
                
                if (!workingModel) {
                    workingModel = modelName;
                }
                
            } catch (error) {
                console.log(`❌ ${modelName}: Error - ${error.message}`);
            }
            console.log('');
        }
        
        // Recomendación
        console.log('💡 Recomendación:');
        if (workingModel) {
            console.log(`   • Usar "${workingModel}" como modelo principal`);
            console.log('   • El sistema funcionará correctamente con este modelo');
        } else {
            console.log('   • Ningún modelo está funcionando');
            console.log('   • Verifica tu clave de API y permisos');
            console.log('   • El sistema usará fallbacks locales');
        }
        
        console.log('\n📋 Información adicional:');
        console.log('   • gemini-1.5-pro: Mejor para tareas complejas');
        console.log('   • gemini-1.5-flash: Más rápido, bueno para respuestas simples');
        console.log('   • gemini-pro: Modelo estándar');
        console.log('   • gemini-pro-vision: Para imágenes + texto');
        
    } catch (error) {
        console.error('❌ Error verificando modelos:', error.message);
        console.log('\n🔧 Posibles soluciones:');
        console.log('1. Verifica que tu clave de API sea válida');
        console.log('2. Asegúrate de tener permisos para usar Google Generative AI');
        console.log('3. Revisa que la API esté habilitada en tu proyecto de Google Cloud');
        console.log('4. Verifica tu conexión a internet');
        console.log('5. Revisa la documentación oficial: https://ai.google.dev/');
    }
}

// Ejecutar la verificación
checkAvailableModels(); 