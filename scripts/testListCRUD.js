const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testListCRUD() {
    console.log('🧪 Probando CRUD de listas...\n');

    let testListId = null;
    let testItemId = null;

    try {
        // 1. Crear una lista de prueba
        console.log('1. Creando lista de prueba...');
        const listData = {
            name: 'Lista de prueba CRUD',
            quality_preference: 'intermedio',
            client_description: 'Estudiante de secundaria, 15 años',
            items_text: '2 Lápices\n1 Cuaderno\n1 Regla'
        };

        const createListResponse = await fetch(`${BASE_URL}/api/shopping`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(listData)
        });
        const createListData = await createListResponse.json();

        if (createListData.success) {
            testListId = createListData.list_id;
            console.log(`✅ Lista creada: ${testListId}`);
            console.log(`   Productos agregados: ${createListData.added_items.length}`);
        } else {
            console.log(`❌ Error creando lista: ${createListData.message}`);
            return;
        }

        // 2. Obtener la lista creada
        console.log('\n2. Obteniendo lista creada...');
        const getListResponse = await fetch(`${BASE_URL}/api/shopping/${testListId}`);
        const getListData = await getListResponse.json();

        if (getListData.success) {
            console.log(`✅ Lista obtenida: ${getListData.list.name}`);
            console.log(`   Productos en la lista: ${getListData.items.length}`);
            
            if (getListData.items.length > 0) {
                testItemId = getListData.items[0].id || getListData.items[0]._id;
                console.log(`   Primer producto ID: ${testItemId}`);
            }
        } else {
            console.log(`❌ Error obteniendo lista: ${getListData.message}`);
        }

        // 3. Obtener un producto específico
        if (testItemId) {
            console.log('\n3. Obteniendo producto específico...');
            const getItemResponse = await fetch(`${BASE_URL}/api/shopping/${testListId}/items/${testItemId}`);
            const getItemData = await getItemResponse.json();

            if (getItemData.success) {
                console.log(`✅ Producto obtenido: ${getItemData.item.item_name_raw}`);
            } else {
                console.log(`❌ Error obteniendo producto: ${getItemData.message}`);
            }
        }

        // 4. Actualizar un producto
        if (testItemId) {
            console.log('\n4. Actualizando producto...');
            const updateItemData = {
                item_name_raw: 'Lápiz HB Actualizado',
                quantity_requested: 3,
                category: 'Escritura'
            };

            const updateItemResponse = await fetch(`${BASE_URL}/api/shopping/${testListId}/items/${testItemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateItemData)
            });
            const updateItemResult = await updateItemResponse.json();

            if (updateItemResult.success) {
                console.log('✅ Producto actualizado correctamente');
            } else {
                console.log(`❌ Error actualizando producto: ${updateItemResult.message}`);
            }
        }

        // 5. Obtener opciones de un producto
        if (testItemId) {
            console.log('\n5. Obteniendo opciones de producto...');
            const optionsResponse = await fetch(`${BASE_URL}/api/shopping/${testListId}/items/${testItemId}/options`);
            const optionsData = await optionsResponse.json();

            if (optionsData.success) {
                console.log(`✅ Opciones obtenidas: ${optionsData.options.length}`);
                if (optionsData.options.length > 0) {
                    console.log(`   Primera opción: ${optionsData.options[0].name}`);
                }
            } else {
                console.log(`❌ Error obteniendo opciones: ${optionsData.message}`);
            }
        }

        // 6. Actualizar la lista completa
        console.log('\n6. Actualizando lista completa...');
        const updateListData = {
            name: 'Lista de prueba CRUD - Actualizada',
            quality_preference: 'premium',
            client_description: 'Estudiante universitario, necesita materiales de alta calidad',
            items_text: '3 Lápices premium\n2 Cuadernos universitarios\n1 Calculadora científica'
        };

        const updateListResponse = await fetch(`${BASE_URL}/api/shopping/${testListId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateListData)
        });
        const updateListResult = await updateListResponse.json();

        if (updateListResult.success) {
            console.log('✅ Lista actualizada correctamente');
        } else {
            console.log(`❌ Error actualizando lista: ${updateListResult.message}`);
        }

        // 7. Verificar la lista actualizada
        console.log('\n7. Verificando lista actualizada...');
        const verifyListResponse = await fetch(`${BASE_URL}/api/shopping/${testListId}`);
        const verifyListData = await verifyListResponse.json();

        if (verifyListData.success) {
            console.log(`✅ Lista verificada: ${verifyListData.list.name}`);
            console.log(`   Productos actualizados: ${verifyListData.items.length}`);
            console.log(`   Calidad: ${verifyListData.list.quality_preference}`);
            console.log(`   Descripción del cliente: ${verifyListData.list.client_description}`);
        } else {
            console.log(`❌ Error verificando lista: ${verifyListData.message}`);
        }

        // 8. Eliminar un producto
        if (testItemId) {
            console.log('\n8. Eliminando producto...');
            const deleteItemResponse = await fetch(`${BASE_URL}/api/shopping/${testListId}/items/${testItemId}`, {
                method: 'DELETE'
            });
            const deleteItemData = await deleteItemResponse.json();

            if (deleteItemData.success) {
                console.log('✅ Producto eliminado correctamente');
            } else {
                console.log(`❌ Error eliminando producto: ${deleteItemData.message}`);
            }
        }

        // 9. Eliminar la lista completa
        console.log('\n9. Eliminando lista completa...');
        const deleteListResponse = await fetch(`${BASE_URL}/api/shopping/${testListId}`, {
            method: 'DELETE'
        });
        const deleteListData = await deleteListResponse.json();

        if (deleteListData.success) {
            console.log('✅ Lista eliminada correctamente');
        } else {
            console.log(`❌ Error eliminando lista: ${deleteListData.message}`);
        }

        // 10. Verificar que la lista fue eliminada
        console.log('\n10. Verificando eliminación...');
        const checkDeleteResponse = await fetch(`${BASE_URL}/api/shopping/${testListId}`);
        const checkDeleteData = await checkDeleteResponse.json();

        if (!checkDeleteData.success) {
            console.log('✅ Lista eliminada correctamente (no encontrada)');
        } else {
            console.log('❌ Error: La lista aún existe');
        }

    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
    }

    console.log('\n🏁 Pruebas de CRUD completadas');
}

// Ejecutar las pruebas
testListCRUD().catch(console.error); 