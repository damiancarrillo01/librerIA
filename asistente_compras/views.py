from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from .models import Product, ShoppingList, ShoppingListItem
import json
import re
from decimal import Decimal


def home_view(request):
    """
    Vista principal que muestra la página de inicio con opciones para crear listas
    y ver las listas existentes del usuario.
    """
    context = {
        'title': 'Bienvenido al Asistente de Compras de Librería con IA',
        'user_lists': []
    }
    
    # Si el usuario está autenticado, mostrar sus listas
    if request.user.is_authenticated:
        context['user_lists'] = ShoppingList.objects.filter(user=request.user)[:5]
    
    return render(request, 'asistente_compras/home.html', context)


def create_shopping_list(request):
    """
    Vista para crear una nueva lista de compras.
    Procesa el formulario y simula la lógica de IA para sugerir productos.
    Permite a usuarios autenticados y no autenticados crear listas.
    """
    if request.method == 'POST':
        list_name = request.POST.get('list_name', '').strip()
        items_text = request.POST.get('items_text', '').strip()
        
        if not list_name or not items_text:
            messages.error(request, 'Por favor, completa todos los campos requeridos.')
            return render(request, 'asistente_compras/notes.html', {
                'title': 'Crear Nueva Lista de Compras',
                'list_name': list_name,
                'items_text': items_text
            })
        
        # Asignar el usuario si está autenticado, de lo contrario será nulo
        user = request.user if request.user.is_authenticated else None
        
        # Crear la lista de compras
        shopping_list = ShoppingList.objects.create(
            user=user,
            name=list_name
        )
        
        # Procesar los ítems del texto ingresado
        items = _parse_items_from_text(items_text)
        
        # Para cada ítem, crear un ShoppingListItem y simular sugerencias de IA
        for item_name, quantity in items:
            shopping_item = ShoppingListItem.objects.create(
                shopping_list=shopping_list,
                item_name_raw=item_name,
                quantity_requested=quantity
            )
            
            # Simular sugerencias de IA
            ai_suggestions = _simulate_ai_suggestions(item_name, quantity)
            shopping_item.set_ai_suggestions(ai_suggestions)
            
            # Si hay una sugerencia principal, asignarla
            if ai_suggestions.get('primary_suggestion'):
                primary_product = _get_or_create_product(ai_suggestions['primary_suggestion'])
                shopping_item.suggested_product = primary_product
                shopping_item.save()
        
        messages.success(request, f'Lista "{list_name}" creada exitosamente con {len(items)} ítems.')
        return redirect('asistente_compras:list_detail', list_id=shopping_list.id)
    
    return render(request, 'asistente_compras/notes.html', {
        'title': 'Crear Nueva Lista de Compras'
    })


def list_detail(request, list_id):
    """
    Vista para mostrar los detalles de una lista de compras específica.
    Muestra los ítems con sus sugerencias de IA.
    Permite a usuarios autenticados y no autenticados ver la lista.
    """
    # Si el usuario es anónimo, intentar obtener la lista sin filtrar por usuario
    # Si el usuario está autenticado, obtener la lista que le pertenece
    if request.user.is_authenticated:
        shopping_list = get_object_or_404(ShoppingList, id=list_id, user=request.user)
    else:
        shopping_list = get_object_or_404(ShoppingList, id=list_id)
        # Opcional: Si quieres que solo las listas creadas por invitados sean accesibles sin login,
        # podrías añadir: and shopping_list.user is None

    items = shopping_list.shoppinglistitem_set.all()
    
    context = {
        'title': f'Detalles de la Lista: {shopping_list.name}',
        'shopping_list': shopping_list,
        'items': items,
        'total_estimated_cost': shopping_list.get_total_estimated_cost(),
        'total_items': shopping_list.get_total_items()
    }
    
    return render(request, 'asistente_compras/list_detail.html', context)


def select_suggestion_for_item(request, list_id, item_id):
    """
    Vista para que el usuario seleccione una sugerencia de producto de la IA
    para un ítem específico de la lista de compras.
    """
    if request.method == 'POST':
        # Obtener la lista de compras, respetando la autenticación del usuario
        if request.user.is_authenticated:
            shopping_list = get_object_or_404(ShoppingList, id=list_id, user=request.user)
        else:
            # Para usuarios anónimos, verificar que la lista exista y no pertenezca a un usuario autenticado
            shopping_list = get_object_or_404(ShoppingList, id=list_id)
            if shopping_list.user is not None:
                messages.error(request, "No tienes permiso para modificar esta lista.")
                return redirect('asistente_compras:list_detail', list_id=list_id)

        # Obtener el ítem de la lista de compras
        shopping_item = get_object_or_404(ShoppingListItem, id=item_id, shopping_list=shopping_list)

        # Obtener el índice de la sugerencia seleccionada de los datos POST
        selected_index = request.POST.get('suggestion_index')
        
        if not selected_index:
            messages.error(request, "No se seleccionó ninguna sugerencia.")
            return redirect('asistente_compras:list_detail', list_id=list_id)

        try:
            selected_index = int(selected_index)
            ai_suggestions = shopping_item.get_ai_suggestions() # Ya retorna un diccionario
            
            if 'suggestions' not in ai_suggestions or not ai_suggestions['suggestions']:
                messages.error(request, "No hay sugerencias de IA disponibles para este ítem.")
                return redirect('asistente_compras:list_detail', list_id=list_id)

            if 0 <= selected_index < len(ai_suggestions['suggestions']):
                selected_suggestion_data = ai_suggestions['suggestions'][selected_index]
                
                # Obtener o crear el Producto basándose en la sugerencia
                primary_product = _get_or_create_product(selected_suggestion_data)
                
                shopping_item.suggested_product = primary_product
                shopping_item.save()
                messages.success(request, f"Producto sugerido para \'{shopping_item.item_name_raw}\' actualizado correctamente.")
            else:
                messages.error(request, "Índice de sugerencia no válido.")
        except ValueError:
            messages.error(request, "Índice de sugerencia no válido.")
        except Exception as e:
            messages.error(request, f"Error al procesar la sugerencia: {e}")

    return redirect('asistente_compras:list_detail', list_id=list_id)


def _parse_items_from_text(text):
    """
    Función auxiliar para parsear el texto de ítems y extraer nombres y cantidades.
    Simula el procesamiento que haría la IA para entender la entrada del usuario.
    """
    items = []
    lines = text.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Patrón para extraer cantidad y nombre del ítem
        # Ejemplos: "3 cuadernos", "2 lápices", "1 mochila", etc.
        quantity_match = re.match(r'^(\d+)\s+(.+)$', line)
        if quantity_match:
            quantity = int(quantity_match.group(1))
            item_name = quantity_match.group(2).strip()
        else:
            # Si no hay cantidad especificada, asumir 1
            quantity = 1
            item_name = line
        
        items.append((item_name, quantity))
    
    return items


def _simulate_ai_suggestions(item_name, quantity):
    """
    Simula las sugerencias de IA para un ítem específico.
    En una implementación real, aquí se conectaría con un modelo de IA.
    """
    suggestions = {
        'item_analyzed': item_name,
        'quantity': quantity,
        'suggestions': [],
        'primary_suggestion': None,
        'confidence_score': 0.85
    }
    
    # Simular diferentes sugerencias basadas en el tipo de ítem
    item_lower = item_name.lower()
    
    if 'cuaderno' in item_lower:
        suggestions['suggestions'] = [
            {
                'product_name': 'Cuaderno A4 Espiral 100 hojas',
                'brand': 'Rivadavia',
                'price': 450.00,
                'quality': 'economico',
                'stock': 50,
                'description': 'Cuaderno económico ideal para uso escolar'
            },
            {
                'product_name': 'Cuaderno A4 Tapa Dura 200 hojas',
                'brand': 'Faber-Castell',
                'price': 1200.00,
                'quality': 'intermedio',
                'stock': 30,
                'description': 'Cuaderno de calidad intermedia con tapa dura'
            },
            {
                'product_name': 'Cuaderno A4 Premium 300 hojas',
                'brand': 'Oxford',
                'price': 2500.00,
                'quality': 'calidad',
                'stock': 15,
                'description': 'Cuaderno premium con papel de alta calidad'
            }
        ]
        suggestions['primary_suggestion'] = suggestions['suggestions'][0]
        
    elif 'lápiz' in item_lower or 'lapiz' in item_lower:
        suggestions['suggestions'] = [
            {
                'product_name': 'Lápiz HB N°2 Caja x12',
                'brand': 'Faber-Castell',
                'price': 350.00,
                'quality': 'economico',
                'stock': 100,
                'description': 'Lápices escolares básicos'
            },
            {
                'product_name': 'Lápiz HB Ecológico x10',
                'brand': 'Staedtler',
                'price': 800.00,
                'quality': 'intermedio',
                'stock': 60,
                'description': 'Lápices ecológicos de calidad media'
            }
        ]
        suggestions['primary_suggestion'] = suggestions['suggestions'][0]
        
    elif 'mochila' in item_lower:
        suggestions['suggestions'] = [
            {
                'product_name': 'Mochila Escolar Básica',
                'brand': 'Genérica',
                'price': 2500.00,
                'quality': 'economico',
                'stock': 25,
                'description': 'Mochila escolar básica con múltiples compartimentos'
            },
            {
                'product_name': 'Mochila Escolar con Ruedas',
                'brand': 'Samsonite',
                'price': 8500.00,
                'quality': 'calidad',
                'stock': 10,
                'description': 'Mochila de alta calidad con sistema de ruedas'
            }
        ]
        suggestions['primary_suggestion'] = suggestions['suggestions'][0]
        
    else:
        # Sugerencia genérica para ítems no reconocidos
        suggestions['suggestions'] = [
            {
                'product_name': f'Producto: {item_name}',
                'brand': 'Genérica',
                'price': 500.00,
                'quality': 'intermedio',
                'stock': 20,
                'description': 'Producto sugerido por IA'
            }
        ]
        suggestions['primary_suggestion'] = suggestions['suggestions'][0]
        suggestions['confidence_score'] = 0.60
    
    return suggestions


def _get_or_create_product(product_data):
    """
    Función auxiliar para obtener o crear un producto basado en los datos de la IA.
    En una implementación real, esto se conectaría con el catálogo existente.
    """
    # Buscar si ya existe un producto similar
    existing_product = Product.objects.filter(
        name__icontains=product_data['product_name'][:50]
    ).first()
    
    if existing_product:
        return existing_product
    
    # Crear un nuevo producto
    return Product.objects.create(
        name=product_data['product_name'],
        description=product_data['description'],
        price=Decimal(str(product_data['price'])),
        brand=product_data['brand'],
        quality_category=product_data['quality'],
        stock=product_data['stock']
    )
