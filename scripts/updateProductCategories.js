const firebase = require('../config/firebase');

// Mapeo de nombres de productos a categorías
const categoryMapping = {
    // Papelería
    'cuaderno': 'Papelería',
    'libreta': 'Papelería',
    'agenda': 'Organización',
    'carpeta': 'Organización',
    
    // Escritura
    'lápiz': 'Escritura',
    'lapiz': 'Escritura',
    'bolígrafo': 'Escritura',
    'boligrafo': 'Escritura',
    'resaltador': 'Escritura',
    'marcador': 'Escritura',
    'goma': 'Escritura',
    'sacapuntas': 'Escritura',
    'corrector': 'Escritura',
    
    // Geometría
    'regla': 'Geometría',
    'compás': 'Geometría',
    'compas': 'Geometría',
    'transportador': 'Geometría',
    'escuadra': 'Geometría',
    'cartabón': 'Geometría',
    'cartabon': 'Geometría',
    
    // Manualidades
    'tijeras': 'Manualidades',
    'pegamento': 'Manualidades',
    'grapadora': 'Manualidades',
    'clips': 'Manualidades',
    'cinta': 'Manualidades',
    
    // Organización
    'mochila': 'Organización',
    'estuche': 'Organización',
    'separadores': 'Organización',
    'post-it': 'Organización',
    'postit': 'Organización',
    
    // Matemáticas
    'calculadora': 'Matemáticas',
    
    // Arte
    'acuarelas': 'Arte',
    'pinceles': 'Arte',
    'block': 'Arte',
    'colores': 'Arte',
    'plastilina': 'Arte',
    'papel': 'Arte',
    'cartulina': 'Arte',
    'lustre': 'Arte',
    
    // Tecnología
    'pendrive': 'Tecnología',
    'usb': 'Tecnología',
    'mouse': 'Tecnología',
    'teclado': 'Tecnología',
    'audífonos': 'Tecnología',
    'audifonos': 'Tecnología',
    'laptop': 'Tecnología'
};

function determineCategory(productName) {
    const name = productName.toLowerCase();
    
    // Buscar coincidencias exactas primero
    for (const [keyword, category] of Object.entries(categoryMapping)) {
        if (name.includes(keyword)) {
            return category;
        }
    }
    
    // Si no hay coincidencia, usar categoría por defecto
    return 'Otros';
}

async function updateProductCategories() {
    console.log('🔄 Actualizando categorías de productos...\n');
    
    try {
        const productsRef = firebase.db.collection('products');
        const snapshot = await productsRef.get();
        
        console.log(`📦 Productos encontrados: ${snapshot.size}`);
        
        let updatedCount = 0;
        let alreadyHasCategory = 0;
        
        const batch = firebase.db.batch();
        
        snapshot.forEach(doc => {
            const product = doc.data();
            const productName = product.name || '';
            
            // Si ya tiene categoría, no actualizar
            if (product.category && product.category !== 'undefined') {
                alreadyHasCategory++;
                return;
            }
            
            // Determinar categoría basada en el nombre
            const category = determineCategory(productName);
            
            // Agregar operación de actualización al batch
            batch.update(doc.ref, { category: category });
            updatedCount++;
            
            console.log(`   • ${productName} → ${category}`);
        });
        
        if (updatedCount > 0) {
            console.log(`\n💾 Guardando ${updatedCount} actualizaciones...`);
            await batch.commit();
            console.log('✅ Actualizaciones guardadas exitosamente');
        } else {
            console.log('✅ No hay productos que necesiten actualización');
        }
        
        console.log(`\n📊 Resumen:`);
        console.log(`   • Productos con categoría: ${alreadyHasCategory}`);
        console.log(`   • Productos actualizados: ${updatedCount}`);
        console.log(`   • Total de productos: ${snapshot.size}`);
        
        // Verificar el resultado
        console.log('\n🔍 Verificando resultado...');
        const verificationSnapshot = await productsRef.get();
        const productsWithoutCategory = [];
        
        verificationSnapshot.forEach(doc => {
            const product = doc.data();
            if (!product.category || product.category === 'undefined') {
                productsWithoutCategory.push(product.name);
            }
        });
        
        if (productsWithoutCategory.length > 0) {
            console.log(`⚠️ Productos sin categoría después de la actualización: ${productsWithoutCategory.length}`);
            productsWithoutCategory.slice(0, 5).forEach(name => {
                console.log(`   • ${name}`);
            });
        } else {
            console.log('✅ Todos los productos tienen categoría asignada');
        }
        
        console.log('\n🎉 ¡Actualización de categorías completada!');
        
    } catch (error) {
        console.error('❌ Error actualizando categorías:', error);
        throw error;
    }
}

// Ejecutar la actualización
updateProductCategories().then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
}).catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
}); 