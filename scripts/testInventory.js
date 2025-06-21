const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testInventory() {
    console.log('🧪 Probando funcionalidad del inventario...\n');

    try {
        // 1. Obtener todos los productos
        console.log('1. Obteniendo todos los productos...');
        const productsResponse = await fetch(`${BASE_URL}/api/products`);
        const productsData = await productsResponse.json();
        
        if (productsData.success) {
            console.log(`✅ Productos obtenidos: ${productsData.products.length}`);
            if (productsData.products.length > 0) {
                console.log('   Primeros 3 productos:');
                productsData.products.slice(0, 3).forEach((product, index) => {
                    console.log(`   ${index + 1}. ${product.name} - Stock: ${product.stock} - Precio: $${product.price}`);
                });
            } else {
                console.log('   ⚠️  No hay productos en el inventario');
            }
        } else {
            console.log(`❌ Error obteniendo productos: ${productsData.message}`);
        }

        // 2. Crear un producto de prueba
        console.log('\n2. Creando producto de prueba...');
        const testProduct = {
            name: 'Lápiz HB Faber-Castell',
            description: 'Lápiz de grafito HB de alta calidad',
            price: 2.50,
            brand: 'Faber-Castell',
            quality_category: 'premium',
            stock: 100
        };

        const createResponse = await fetch(`${BASE_URL}/api/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testProduct)
        });
        const createData = await createResponse.json();

        if (createData.success) {
            console.log(`✅ Producto creado: ${createData.product_id}`);
            
            // 3. Obtener el producto creado
            console.log('\n3. Obteniendo producto creado...');
            const getProductResponse = await fetch(`${BASE_URL}/api/products/${createData.product_id}`);
            const getProductData = await getProductResponse.json();

            if (getProductData.success) {
                console.log(`✅ Producto obtenido: ${getProductData.product.name}`);
            } else {
                console.log(`❌ Error obteniendo producto: ${getProductData.message}`);
            }

            // 4. Actualizar el producto
            console.log('\n4. Actualizando producto...');
            const updateData = {
                stock: 95,
                price: 2.75
            };

            const updateResponse = await fetch(`${BASE_URL}/api/products/${createData.product_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
            const updateResult = await updateResponse.json();

            if (updateResult.success) {
                console.log('✅ Producto actualizado correctamente');
            } else {
                console.log(`❌ Error actualizando producto: ${updateResult.message}`);
            }

            // 5. Buscar productos
            console.log('\n5. Buscando productos...');
            const searchResponse = await fetch(`${BASE_URL}/api/products/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ search_term: 'lápiz' })
            });
            const searchData = await searchResponse.json();

            if (searchData.success) {
                console.log(`✅ Búsqueda exitosa: ${searchData.count} productos encontrados`);
            } else {
                console.log(`❌ Error en búsqueda: ${searchData.message}`);
            }

            // 6. Eliminar el producto de prueba
            console.log('\n6. Eliminando producto de prueba...');
            const deleteResponse = await fetch(`${BASE_URL}/api/products/${createData.product_id}`, {
                method: 'DELETE'
            });
            const deleteData = await deleteResponse.json();

            if (deleteData.success) {
                console.log('✅ Producto eliminado correctamente');
            } else {
                console.log(`❌ Error eliminando producto: ${deleteData.message}`);
            }

        } else {
            console.log(`❌ Error creando producto: ${createData.message}`);
        }

        // 7. Probar creación de lista con inventario
        console.log('\n7. Probando creación de lista con inventario...');
        const listData = {
            name: 'Lista de prueba con inventario',
            quality_preference: 'intermedio',
            client_description: 'Estudiante universitario, necesita materiales de calidad media',
            items_text: '2 Lápices\n1 Cuaderno\n1 Regla'
        };

        const listResponse = await fetch(`${BASE_URL}/api/shopping`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(listData)
        });
        const listResult = await listResponse.json();

        if (listResult.success) {
            console.log(`✅ Lista creada: ${listResult.list_id}`);
            console.log(`   Productos agregados: ${listResult.added_items.length}`);
            console.log(`   Productos sin stock: ${listResult.no_stock_items.length}`);
            
            if (listResult.added_items.length > 0) {
                console.log('   Productos agregados:');
                listResult.added_items.forEach(item => {
                    console.log(`   - ${item.name} (cantidad: ${item.quantity})`);
                });
            }
            
            if (listResult.no_stock_items.length > 0) {
                console.log('   Productos sin stock:');
                listResult.no_stock_items.forEach(item => {
                    console.log(`   - ${item.name} (solicitado: ${item.quantity_requested})`);
                });
            }
        } else {
            console.log(`❌ Error creando lista: ${listResult.message}`);
        }

    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
    }

    console.log('\n🏁 Pruebas completadas');
}

// Ejecutar las pruebas
testInventory().catch(console.error); 