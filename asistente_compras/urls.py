from django.urls import path
from . import views

app_name = 'asistente_compras'

urlpatterns = [
    # Vista principal - página de inicio
    path('', views.home_view, name='home'),
    
    # Crear nueva lista de compras
    path('crear-lista/', views.create_shopping_list, name='create_shopping_list'),
    
    # Ver detalles de una lista específica
    path('lista/<int:list_id>/', views.list_detail, name='list_detail'),
    # URL para seleccionar un producto sugerido para un ítem de la lista
    path('lista/<int:list_id>/item/<int:item_id>/seleccionar-sugerencia/', 
         views.select_suggestion_for_item, name='select_suggestion_for_item'),
] 