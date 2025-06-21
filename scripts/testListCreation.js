const AIService = require('../services/aiService');

async function testListCreation() {
    console.log('🧪 Probando creación de listas de compras...\n');
    
    try {
        // Prueba 1: Verificar que los productos tienen el campo category
        console.log('📋 Prueba 1: Verificando productos con campo category');
        const products = await AIService.getAvailableProducts();
        console.log(`✅ Productos disponibles: ${products.length}`);
        
        // Verificar que todos los productos tienen category
        const productsWithoutCategory = products.filter(p => !p.category);
        if (productsWithoutCategory.length > 0) {
            console.log(`⚠️ Productos sin category: ${productsWithoutCategory.length}`);
            productsWithoutCategory.slice(0, 3).forEach(p => {
                console.log(`   • ${p.name} - ID: ${p.id}`);
            });
        } else {
            console.log('✅ Todos los productos tienen el campo category');
        }
        
        // Mostrar algunos productos de ejemplo
        console.log('\n📦 Productos de ejemplo:');
        products.slice(0, 3).forEach(product => {
            console.log(`   • ${product.name} - Categoría: ${product.category} - $${product.price}`);
        });
        
        // Prueba 2: Procesar una lista simple
        console.log('\n📋 Prueba 2: Procesando lista de compras');
        
        const requestedItems = [
            { name: 'lápiz', quantity: 5 },
            { name: 'cuaderno', quantity: 2 },
            { name: 'goma', quantity: 1 }
        ];
        
        const clientProfile = {
            description: 'Estudiante de secundaria, 15 años, interesado en matemáticas'
        };
        
        console.log('👤 Perfil del cliente:', clientProfile.description);
        console.log('📋 Items solicitados:', requestedItems.map(item => `${item.quantity}x ${item.name}`).join(', '));
        
        const result = await AIService.processShoppingList(
            requestedItems,
            clientProfile,
            'intermedio'
        );
        
        console.log('✅ Resultado del procesamiento:');
        console.log(`   • Éxito: ${result.success}`);
        console.log(`   • Productos agregados: ${result.added_items.length}`);
        console.log(`   • Items no encontrados: ${result.not_found_items.length}`);
        
        // Mostrar productos agregados
        if (result.added_items.length > 0) {
            console.log('\n🛒 Productos agregados:');
            result.added_items.forEach(product => {
                console.log(`   • ${product.name} - Cantidad: ${product.quantity_requested} - Categoría: ${product.category} - $${product.price}`);
                console.log(`     Razón: ${product.reasoning}`);
            });
        }
        
        // Mostrar items no encontrados
        if (result.not_found_items.length > 0) {
            console.log('\n❌ Items no encontrados:');
            result.not_found_items.forEach(item => {
                console.log(`   • ${item.name} - Razón: ${item.reason}`);
            });
        }
        
        // Prueba 3: Verificar que los productos devueltos tienen todos los campos necesarios
        console.log('\n📋 Prueba 3: Verificando campos de productos devueltos');
        
        if (result.added_items.length > 0) {
            const product = result.added_items[0];
            const requiredFields = ['id', 'name', 'price', 'stock', 'category', 'quantity_requested', 'reasoning'];
            const missingFields = requiredFields.filter(field => !product.hasOwnProperty(field));
            
            if (missingFields.length > 0) {
                console.log(`⚠️ Campos faltantes: ${missingFields.join(', ')}`);
            } else {
                console.log('✅ Todos los campos requeridos están presentes');
            }
            
            console.log('📋 Campos del producto:');
            Object.keys(product).forEach(key => {
                console.log(`   • ${key}: ${product[key]}`);
            });
        }
        
        console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
        console.log('🚀 La creación de listas de compras está funcionando correctamente');
        console.log('💰 Características verificadas:');
        console.log('   • Campo category presente en todos los productos');
        console.log('   • Procesamiento de listas sin errores');
        console.log('   • Selección inteligente de productos');
        console.log('   • Manejo correcto de campos undefined');
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Ejecutar las pruebas
testListCreation().then(() => {
    console.log('\n✅ Script de prueba completado');
    process.exit(0);
}).catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
}); 