// Librería IA - JavaScript principal

// Configuración global
const API_BASE_URL = '/api';

// Utilidades
const utils = {
    // Formatear precio en peso chileno
    formatPrice: (price) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(price);
    },

    // Mostrar notificación
    showNotification: (message, type = 'success') => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.main-container') || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-dismiss después de 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    },

    // Mostrar loading
    showLoading: () => {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="height: 100vh;">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
            </div>
        `;
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            z-index: 9999;
        `;
        document.body.appendChild(loadingDiv);
    },

    // Ocultar loading
    hideLoading: () => {
        const loadingDiv = document.getElementById('loading-overlay');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    },

    // Validar formulario
    validateForm: (formData) => {
        const errors = [];
        for (const [key, value] of formData.entries()) {
            if (!value || value.trim() === '') {
                errors.push(`El campo ${key} es requerido`);
            }
        }
        return errors;
    }
};

// API Client
const api = {
    // GET request
    get: async (endpoint) => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error en la solicitud');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // POST request
    post: async (endpoint, body) => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error en la solicitud');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // PUT request
    put: async (endpoint, body) => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error en la solicitud');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // DELETE request
    delete: async (endpoint) => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error en la solicitud');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};

// Gestión de listas de compras
const shoppingLists = {
    // Cargar todas las listas
    loadAll: async () => {
        try {
            utils.showLoading();
            const data = await api.get('/shopping');
            return data.lists;
        } catch (error) {
            utils.showNotification(error.message, 'danger');
            return [];
        } finally {
            utils.hideLoading();
        }
    },

    // Crear nueva lista
    create: async (listData) => {
        try {
            utils.showLoading();
            const data = await api.post('/shopping', listData);
            utils.showNotification(data.message, 'success');
            return data.list_id;
        } catch (error) {
            utils.showNotification(error.message, 'danger');
            throw error;
        } finally {
            utils.hideLoading();
        }
    },

    // Crear lista estándar
    createStandard: async (type, qualityPreference) => {
        try {
            utils.showLoading();
            const data = await api.post(`/shopping/standard/${type}`, { quality_preference: qualityPreference });
            utils.showNotification(data.message, 'success');
            return data.list_id;
        } catch (error) {
            utils.showNotification(error.message, 'danger');
            throw error;
        } finally {
            utils.hideLoading();
        }
    },

    // Cargar lista específica
    loadById: async (id) => {
        try {
            utils.showLoading();
            const data = await api.get(`/shopping/${id}`);
            return data;
        } catch (error) {
            utils.showNotification(error.message, 'danger');
            throw error;
        } finally {
            utils.hideLoading();
        }
    },

    // Agregar ítem a lista
    addItem: async (listId, itemData) => {
        try {
            const data = await api.post(`/shopping/${listId}/items`, itemData);
            utils.showNotification(data.message, 'success');
            return data;
        } catch (error) {
            utils.showNotification(error.message, 'danger');
            throw error;
        }
    },

    // Actualizar ítem
    updateItem: async (listId, itemId, itemData) => {
        try {
            const data = await api.put(`/shopping/${listId}/items/${itemId}`, itemData);
            utils.showNotification(data.message, 'success');
            return data;
        } catch (error) {
            utils.showNotification(error.message, 'danger');
            throw error;
        }
    },

    // Eliminar ítem
    deleteItem: async (listId, itemId) => {
        try {
            const data = await api.delete(`/shopping/${listId}/items/${itemId}`);
            utils.showNotification(data.message, 'success');
            return data;
        } catch (error) {
            utils.showNotification(error.message, 'danger');
            throw error;
        }
    },

    // Exportar a PDF
    exportToPDF: (listId) => {
        window.open(`${API_BASE_URL}/shopping/${listId}/export-pdf`, '_blank');
    }
};

// Gestión de productos
const products = {
    // Cargar todos los productos
    loadAll: async () => {
        try {
            utils.showLoading();
            const data = await api.get('/products');
            return data.products;
        } catch (error) {
            utils.showNotification(error.message, 'danger');
            return [];
        } finally {
            utils.hideLoading();
        }
    },

    // Buscar productos
    search: async (searchTerm) => {
        try {
            const data = await api.post('/products/search', { search_term: searchTerm });
            return data.products;
        } catch (error) {
            utils.showNotification(error.message, 'danger');
            return [];
        }
    },

    // Crear producto
    create: async (productData) => {
        try {
            const data = await api.post('/products', productData);
            utils.showNotification(data.message, 'success');
            return data.product_id;
        } catch (error) {
            utils.showNotification(error.message, 'danger');
            throw error;
        }
    },

    // Actualizar producto
    update: async (productId, productData) => {
        try {
            const data = await api.put(`/products/${productId}`, productData);
            utils.showNotification(data.message, 'success');
            return data;
        } catch (error) {
            utils.showNotification(error.message, 'danger');
            throw error;
        }
    },

    // Eliminar producto
    delete: async (productId) => {
        try {
            const data = await api.delete(`/products/${productId}`);
            utils.showNotification(data.message, 'success');
            return data;
        } catch (error) {
            utils.showNotification(error.message, 'danger');
            throw error;
        }
    }
};

// Gestión de modales
const modals = {
    // Mostrar modal
    show: (modalId) => {
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
    },

    // Ocultar modal
    hide: (modalId) => {
        const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modal) {
            modal.hide();
        }
    },

    // Limpiar formulario de modal
    clearForm: (modalId) => {
        const form = document.querySelector(`#${modalId} form`);
        if (form) {
            form.reset();
        }
    }
};

// Event listeners globales
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Inicializar popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Manejar formularios con validación
    document.querySelectorAll('form[data-validate]').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const errors = utils.validateForm(formData);
            
            if (errors.length > 0) {
                utils.showNotification(errors.join('<br>'), 'danger');
                return;
            }
            
            // Continuar con el envío del formulario
            this.submit();
        });
    });

    // Auto-hide alerts después de 5 segundos
    setTimeout(() => {
        document.querySelectorAll('.alert').forEach(alert => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);

    const btnProcesar = document.getElementById('btnProcesarIA');
    if (btnProcesar) {
        btnProcesar.addEventListener('click', async function(e) {
            e.preventDefault();
            const lista = document.getElementById('items_text').value
                .split('\n')
                .map(x => x.trim())
                .filter(x => x !== '');
            const calidad = document.getElementById('quality_preference').value;
            const recomendacionesDiv = document.getElementById('recomendaciones');
            recomendacionesDiv.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Procesando...</span></div><p class="mt-2">Procesando recomendaciones...</p></div>';

            try {
                const res = await fetch('/ai/recomendar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lista, calidad })
                });
                const data = await res.json();
                if (data.recomendaciones) {
                    // Guardar una copia local para manipulación en la vista
                    let recomendaciones = JSON.parse(JSON.stringify(data.recomendaciones));
                    renderRecomendacionesVista(recomendaciones);

                    function renderRecomendacionesVista(recs) {
                        let html = `<div class="card mt-4">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0">
                                    <i class="fas fa-robot me-2"></i>
                                    Recomendaciones de la IA
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="list-group" id="lista-recomendaciones-ia">`;
                        recs.forEach((r, idx) => {
                            const s = r.sugerencia.primary_suggestion;
                            const calidad = s && s.quality_category ? s.quality_category : '-';
                            let calidadColor = 'secondary';
                            if (calidad === 'económico' || calidad === 'economico') calidadColor = 'success';
                            else if (calidad === 'intermedio') calidadColor = 'warning';
                            else if (calidad === 'calidad') calidadColor = 'danger';
                            html += `
                                <div class="list-group-item mb-3 shadow-sm rounded position-relative">
                                    <div class="row align-items-center">
                                        <div class="col-md-3 fw-bold">
                                            <span class="me-2">${r.item}</span>
                                            <span class="badge bg-primary">${r.cantidad}</span>
                                        </div>
                                        <div class="col-md-4">
                                            <div><strong>${s ? s.name : '<span class=\'text-danger\'>No encontrada</span>'}</strong></div>
                                            <div class="small text-muted">${s && s.brand ? s.brand : '-'}</div>
                                            <span class="badge bg-${calidadColor} text-capitalize">${calidad}</span>
                                        </div>
                                        <div class="col-md-2">
                                            <div class="fw-bold">${s && s.price ? '$' + s.price : '-'}</div>
                                            <div class="small text-muted">Total: ${s && s.price ? '$' + (s.price * r.cantidad) : '-'}</div>
                                        </div>
                                        <div class="col-md-3 d-flex gap-2 flex-wrap">
                                            <button class="btn btn-info btn-sm ver-opciones-btn" data-idx="${idx}"><i class="fas fa-list"></i> Ver Opciones</button>
                                            <button class="btn btn-secondary btn-sm editar-btn" data-idx="${idx}"><i class="fas fa-edit"></i> Editar</button>
                                            <button class="btn btn-danger btn-sm eliminar-btn" data-idx="${idx}"><i class="fas fa-trash"></i> Eliminar</button>
                                        </div>
                                    </div>
                                </div>`;
                        });
                        html += `</div></div></div>`;
                        recomendacionesDiv.innerHTML = html;

                        // Botón Eliminar
                        document.querySelectorAll('.eliminar-btn').forEach(btn => {
                            btn.addEventListener('click', function() {
                                const idx = parseInt(this.getAttribute('data-idx'));
                                const r = recs[idx];
                                // Confirmación antes de eliminar
                                if (confirm(`¿Estás seguro de que deseas eliminar "${r.item}" de la lista?`)) {
                                    recs.splice(idx, 1);
                                    renderRecomendacionesVista(recs);
                                }
                            });
                        });

                        // Botón Editar (abre modal simple)
                        document.querySelectorAll('.editar-btn').forEach(btn => {
                            btn.addEventListener('click', function() {
                                const idx = parseInt(this.getAttribute('data-idx'));
                                mostrarModalEditar(idx);
                            });
                        });

                        // Botón Ver Opciones (abre modal)
                        document.querySelectorAll('.ver-opciones-btn').forEach(btn => {
                            btn.addEventListener('click', function() {
                                const idx = parseInt(this.getAttribute('data-idx'));
                                mostrarModalOpciones(idx);
                            });
                        });
                    }

                    // Modal para Ver Opciones
                    function mostrarModalOpciones(idx) {
                        const r = recomendaciones[idx];
                        const alternativas = r.sugerencia.alternative_suggestions || [];
                        let html = `<div class='modal fade' id='modalOpciones' tabindex='-1'>
                            <div class='modal-dialog'>
                                <div class='modal-content'>
                                    <div class='modal-header'>
                                        <h5 class='modal-title'>Opciones para: ${r.item}</h5>
                                        <button type='button' class='btn-close' data-bs-dismiss='modal'></button>
                                    </div>
                                    <div class='modal-body'>`;
                        if (alternativas.length === 0) {
                            html += `<div class='alert alert-warning'>No hay alternativas disponibles.</div>`;
                        } else {
                            html += `<ul class='list-group'>`;
                            alternativas.forEach((alt, altIdx) => {
                                html += `<li class='list-group-item d-flex justify-content-between align-items-center'>
                                    <div>
                                        <strong>${alt.name}</strong> <span class='badge bg-secondary ms-2'>${alt.brand || '-'}</span> <span class='badge bg-info ms-2'>$${alt.price}</span>
                                    </div>
                                    <button class='btn btn-outline-primary btn-sm seleccionar-alternativa-btn' data-idx='${idx}' data-alt-idx='${altIdx}'>Seleccionar</button>
                                </li>`;
                            });
                            html += `</ul>`;
                        }
                        html += `</div></div></div></div>`;
                        // Insertar y mostrar modal
                        let modalDiv = document.createElement('div');
                        modalDiv.innerHTML = html;
                        document.body.appendChild(modalDiv);
                        let modal = new bootstrap.Modal(modalDiv.querySelector('#modalOpciones'));
                        modal.show();
                        // Seleccionar alternativa
                        modalDiv.querySelectorAll('.seleccionar-alternativa-btn').forEach(btn => {
                            btn.addEventListener('click', function() {
                                const altIdx = parseInt(this.getAttribute('data-alt-idx'));
                                // Intercambiar principal y alternativa
                                const temp = r.sugerencia.primary_suggestion;
                                r.sugerencia.primary_suggestion = r.sugerencia.alternative_suggestions[altIdx];
                                r.sugerencia.alternative_suggestions[altIdx] = temp;
                                modal.hide();
                                setTimeout(()=>{
                                    modalDiv.remove();
                                    renderRecomendacionesVista(recomendaciones);
                                }, 300);
                            });
                        });
                        // Limpiar modal al cerrar
                        modalDiv.querySelector('.btn-close').addEventListener('click', function() {
                            setTimeout(()=>modalDiv.remove(), 300);
                        });
                    }

                    // Modal para Editar
                    function mostrarModalEditar(idx) {
                        const r = recomendaciones[idx];
                        let html = `<div class='modal fade' id='modalEditar' tabindex='-1'>
                            <div class='modal-dialog'>
                                <div class='modal-content'>
                                    <div class='modal-header'>
                                        <h5 class='modal-title'>Editar ítem: ${r.item}</h5>
                                        <button type='button' class='btn-close' data-bs-dismiss='modal'></button>
                                    </div>
                                    <div class='modal-body'>
                                        <form id='formEditarRecomendacion'>
                                            <div class='mb-3'>
                                                <label class='form-label'>Nombre del ítem solicitado</label>
                                                <input type='text' class='form-control' name='item' value='${r.item}' required />
                                            </div>
                                            <div class='mb-3'>
                                                <label class='form-label'>Cantidad solicitada</label>
                                                <input type='number' class='form-control' name='cantidad' value='${r.cantidad || 1}' min='1' required />
                                            </div>
                                            <div class='d-grid'>
                                                <button type='submit' class='btn btn-primary'>Guardar Cambios</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                        let modalDiv = document.createElement('div');
                        modalDiv.innerHTML = html;
                        document.body.appendChild(modalDiv);
                        let modal = new bootstrap.Modal(modalDiv.querySelector('#modalEditar'));
                        modal.show();
                        // Guardar cambios
                        modalDiv.querySelector('#formEditarRecomendacion').addEventListener('submit', async function(e) {
                            e.preventDefault();
                            const formData = new FormData(this);
                            const nuevoItem = formData.get('item');
                            const nuevaCantidad = parseInt(formData.get('cantidad')) || 1;
                            // Mostrar loading en el modal
                            this.querySelector('button[type="submit"]').disabled = true;
                            this.querySelector('button[type="submit"]').innerText = 'Consultando IA...';
                            // Consultar IA solo para este ítem
                            try {
                                const calidad = r.sugerencia.primary_suggestion && r.sugerencia.primary_suggestion.quality_category ? r.sugerencia.primary_suggestion.quality_category : 'cualquiera';
                                const lista = [`${nuevaCantidad} ${nuevoItem}`];
                                const res = await fetch('/ai/recomendar', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ lista, calidad })
                                });
                                const data = await res.json();
                                if (data.recomendaciones && data.recomendaciones.length > 0) {
                                    r.item = data.recomendaciones[0].item;
                                    r.cantidad = data.recomendaciones[0].cantidad;
                                    r.sugerencia = data.recomendaciones[0].sugerencia;
                                } else {
                                    r.item = nuevoItem;
                                    r.cantidad = nuevaCantidad;
                                }
                            } catch (err) {
                                r.item = nuevoItem;
                                r.cantidad = nuevaCantidad;
                            }
                            modal.hide();
                            setTimeout(()=>{
                                modalDiv.remove();
                                renderRecomendacionesVista(recomendaciones);
                            }, 300);
                        });
                        // Limpiar modal al cerrar
                        modalDiv.querySelector('.btn-close').addEventListener('click', function() {
                            setTimeout(()=>modalDiv.remove(), 300);
                        });
                    }
                } else {
                    recomendacionesDiv.innerHTML = '<div class="alert alert-warning mt-4">No se recibieron recomendaciones.</div>';
                }
            } catch (err) {
                recomendacionesDiv.innerHTML = '<div class="alert alert-danger mt-4">Error al procesar la lista.</div>';
            }
        });
    }
});

// Exportar para uso global
window.LibreriaIA = {
    utils,
    api,
    shoppingLists,
    products,
    modals
}; 